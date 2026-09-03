<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\RegisterController;
use App\Http\Controllers\AlumnoController;
use App\Http\Controllers\PagoController;
use App\Http\Controllers\AsistenciaController;
use App\Http\Controllers\EventoController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ConfiguracionCintaController;
use App\Http\Controllers\HorarioController;
use App\Http\Controllers\EventoAlumnoController;


/*
|--------------------------------------------------------------------------
| Rutas Públicas (sin autenticación)
|--------------------------------------------------------------------------
*/

Route::get('/ping', fn() => response()->json([
    'status'    => 'ok',
    'app'       => 'GymCloud',
    'timestamp' => now()->toIso8601String(),
]));

Route::get('/ejecutar-migraciones', function () {
    try {
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        $outputMigrate = \Illuminate\Support\Facades\Artisan::output();

        // Limpiar tenant_id de todos los superadmins en base de datos
        \Illuminate\Support\Facades\DB::table('users')
            ->where('is_superadmin', true)
            ->update(['tenant_id' => null]);

        // Sincronizar todos los tenants con sus escuelas (nombre y logo)
        if (\Illuminate\Support\Facades\Schema::hasTable('escuelas') && \Illuminate\Support\Facades\Schema::hasTable('tenants')) {
            $escuelas = \Illuminate\Support\Facades\DB::table('escuelas')->get();
            foreach ($escuelas as $esc) {
                $updates = [];
                if (!empty($esc->nombre)) {
                    $updates['nombre'] = $esc->nombre;
                }
                if (!empty($esc->logo_url)) {
                    $updates['logo'] = $esc->logo_url;
                }
                if (!empty($updates) && !empty($esc->tenant_id)) {
                    \Illuminate\Support\Facades\DB::table('tenants')->where('id', $esc->tenant_id)->update($updates);
                }
            }
        }

        $outputSeed = '';
        try {
            \Illuminate\Support\Facades\Artisan::call('db:seed', ['--force' => true]);
            $outputSeed = \Illuminate\Support\Facades\Artisan::output();
        } catch (\Throwable $se) {
            $outputSeed = 'Seed ignorado: ' . $se->getMessage();
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Migraciones ejecutadas con éxito y SuperAdmin desvinculado de tenants.',
            'migrate_output' => $outputMigrate,
            'seed_output' => $outputSeed,
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ], 200);
    }
});

// Diagnostico: verificar tipos de columna y forzar cambio a TEXT
Route::get('/fix-columns', function () {
    $results = [];
    try {
        // Verificar tipos actuales
        $cols = \Illuminate\Support\Facades\DB::select("
            SELECT table_name, column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE (table_name = 'alumnos' AND column_name = 'foto')
               OR (table_name = 'escuelas' AND column_name = 'logo_url')
               OR (table_name = 'tenants' AND column_name = 'logo')
               OR (table_name = 'instructors' AND column_name = 'foto_url')
            ORDER BY table_name
        ");
        $results['antes'] = $cols;

        // Forzar cambio a TEXT
        \Illuminate\Support\Facades\DB::statement('ALTER TABLE alumnos ALTER COLUMN foto TYPE TEXT');
        \Illuminate\Support\Facades\DB::statement('ALTER TABLE escuelas ALTER COLUMN logo_url TYPE TEXT');
        \Illuminate\Support\Facades\DB::statement('ALTER TABLE tenants ALTER COLUMN logo TYPE TEXT');
        try {
            \Illuminate\Support\Facades\DB::statement('ALTER TABLE instructors ALTER COLUMN foto_url TYPE TEXT');
        } catch (\Throwable $e) {}

        // Verificar tipos después
        $colsAfter = \Illuminate\Support\Facades\DB::select("
            SELECT table_name, column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE (table_name = 'alumnos' AND column_name = 'foto')
               OR (table_name = 'escuelas' AND column_name = 'logo_url')
               OR (table_name = 'tenants' AND column_name = 'logo')
               OR (table_name = 'instructors' AND column_name = 'foto_url')
            ORDER BY table_name
        ");
        $results['despues'] = $colsAfter;

        // También actualizar el nombre del tenant si es TKD Tigres
        $tenant = \App\Models\Tenant::first();
        if ($tenant) {
            $results['tenant_nombre_actual'] = $tenant->nombre;
        }

        return response()->json(['status' => 'ok', 'results' => $results]);
    } catch (\Throwable $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
            'results' => $results,
        ], 200);
    }
});

// Auth
Route::post('/login',    [AuthController::class, 'login']);
Route::post('/register', [RegisterController::class, 'register']);

/*
|--------------------------------------------------------------------------
| Rutas Protegidas (requieren token Sanctum)
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::get('/me',           [AuthController::class, 'me']);
    Route::post('/logout',      [AuthController::class, 'logout']);
    Route::post('/me/avatar',   [\App\Http\Controllers\UserController::class, 'uploadAvatar']);
    Route::delete('/me/avatar', [\App\Http\Controllers\UserController::class, 'quitarAvatar']);

    // Panel de Administrador Global (SuperAdmin)
    Route::middleware(['superadmin'])->prefix('admin')->group(function () {
        // Módulo 1: Dashboard
        Route::get('/dashboard', [\App\Http\Controllers\AdminDashboardController::class, 'index']);

        // Módulo 2: Academias
        Route::get('/academias', [\App\Http\Controllers\AdminAcademiaController::class, 'index']);
        Route::get('/academias/{id}', [\App\Http\Controllers\AdminAcademiaController::class, 'show']);
        Route::get('/academias/{id}/usuarios', [\App\Http\Controllers\AdminAcademiaController::class, 'usuarios']);
        Route::post('/academias/{id}/suspender', [\App\Http\Controllers\AdminAcademiaController::class, 'suspender']);
        Route::post('/academias/{id}/activar', [\App\Http\Controllers\AdminAcademiaController::class, 'activar']);
        Route::delete('/academias/{id}', [\App\Http\Controllers\AdminAcademiaController::class, 'destroy']);

        // Módulo 3: Solicitudes de Registro
        Route::get('/solicitudes', [\App\Http\Controllers\AdminSolicitudController::class, 'index']);
        Route::post('/solicitudes/{id}/aprobar', [\App\Http\Controllers\AdminSolicitudController::class, 'aprobar']);
        Route::post('/solicitudes/{id}/rechazar', [\App\Http\Controllers\AdminSolicitudController::class, 'rechazar']);

        // Módulo 4: Suscripciones
        Route::get('/suscripciones', [\App\Http\Controllers\AdminSuscripcionController::class, 'index']);
        Route::post('/suscripciones/{id}/renovar', [\App\Http\Controllers\AdminSuscripcionController::class, 'renovar']);
        Route::post('/suscripciones/{id}/plan', [\App\Http\Controllers\AdminSuscripcionController::class, 'cambiarPlan']);

        // Módulo 5: Usuarios
        Route::get('/usuarios', [\App\Http\Controllers\AdminUsuarioController::class, 'index']);
        Route::post('/usuarios/{id}/reset-password', [\App\Http\Controllers\AdminUsuarioController::class, 'resetPassword']);
        Route::post('/usuarios/{id}/forzar-password', [\App\Http\Controllers\AdminUsuarioController::class, 'resetPassword']);
        Route::post('/usuarios/{id}/toggle-suspension', [\App\Http\Controllers\AdminUsuarioController::class, 'toggleSuspension']);
        Route::post('/usuarios/{id}/role', [\App\Http\Controllers\AdminUsuarioController::class, 'cambiarRol']);
        Route::post('/usuarios/{id}/cambiar-rol', [\App\Http\Controllers\AdminUsuarioController::class, 'cambiarRol']);
        Route::post('/usuarios/{id}/cambiar-escuela', [\App\Http\Controllers\AdminUsuarioController::class, 'cambiarEscuela']);
        Route::delete('/usuarios/{id}', [\App\Http\Controllers\AdminUsuarioController::class, 'destroy']);

        // Módulo 6: Configuración Global
        Route::get('/configuracion', [\App\Http\Controllers\AdminConfiguracionController::class, 'show']);
        Route::post('/configuracion', [\App\Http\Controllers\AdminConfiguracionController::class, 'update']);
    });

    // Rutas específicas de Escuela/Tenant (bloqueadas para SuperAdmin, filtradas por tenant_id)
    Route::middleware(['tenant'])->group(function () {
        // Dashboard
        Route::get('/dashboard', [DashboardController::class, 'index']);

        // Alumnos
        Route::get('alumnos/{alumno}/predecir-grado', [EventoAlumnoController::class, 'predecirGrado']);
        Route::patch('alumnos/{alumno}/toggle-estatus', [AlumnoController::class, 'toggleEstatus']);
        Route::get('alumnos/{alumno}/perfil', [AlumnoController::class, 'perfil']);
        Route::apiResource('alumnos', AlumnoController::class);
        Route::patch('alumnos/{alumno}/quitar-foto', [AlumnoController::class, 'quitarFoto']);
        Route::post('alumnos/{alumno}/historial-manual', [AlumnoController::class, 'addHistorialManual']);

        // Pagos (accesibles para owner, secretario e instructor — el Policy controla cada acción)
        Route::get('pagos/alumno/{alumno}', [PagoController::class, 'porAlumno']);
        Route::get('pagos', [PagoController::class, 'index']);
        Route::get('pagos/{pago}', [PagoController::class, 'show']);
        Route::post('pagos', [PagoController::class, 'store'])->middleware('role:owner,secretario');
        Route::put('pagos/{pago}', [PagoController::class, 'update'])->middleware('role:owner,secretario');
        Route::patch('pagos/{pago}', [PagoController::class, 'update'])->middleware('role:owner,secretario');
        Route::delete('pagos/{pago}', [PagoController::class, 'destroy'])->middleware('role:owner');

        // Asistencias — rutas fijas primero (antes de las paramétricas)
        Route::get('asistencias/resumen', [AsistenciaController::class, 'resumen']);
        Route::get('asistencias/por-alumno', [AsistenciaController::class, 'porAlumno']);
        Route::get('asistencias/por-fecha', [AsistenciaController::class, 'porFecha']);
        Route::post('asistencias/registrar-dia', [AsistenciaController::class, 'registrarDia']);
        // Asistencias — rutas paramétricas
        Route::get('asistencias/dia/{fecha}', [AsistenciaController::class, 'dia']);
        Route::get('asistencias/alumno-legacy/{alumno}', [AsistenciaController::class, 'alumnoHistorialLegacy']);
        Route::get('asistencias/alumno/{alumno}', [AsistenciaController::class, 'alumno']);
        Route::get('asistencias', [AsistenciaController::class, 'index']);

        // Eventos - CRUD
        Route::apiResource('eventos', EventoController::class);

        // Eventos - Inscripciones (base)
        Route::get('eventos/{evento}/inscritos',       [\App\Http\Controllers\EventoAlumnoController::class, 'getInscritos']);
        Route::post('eventos/{evento}/inscribir',      [\App\Http\Controllers\EventoAlumnoController::class, 'inscribir']);
        Route::put('eventos/{evento}/alumnos/{alumno}', [\App\Http\Controllers\EventoAlumnoController::class, 'actualizarInscripcion']);
        Route::delete('eventos/{evento}/alumnos/{alumno}', [\App\Http\Controllers\EventoAlumnoController::class, 'eliminarInscripcion']);

        // Exámenes - Promover aprobados
        Route::post('eventos/{evento}/promover-aprobados', [\App\Http\Controllers\EventoAlumnoController::class, 'promoverAprobados']);

        // Alertas de pagos pendientes
        Route::get('eventos/alertas/pagos-pendientes', [\App\Http\Controllers\EventoAlumnoController::class, 'alertasPagosPendientes']);

        // Torneos - Modalidades
        Route::get('eventos/{evento}/modalidades',        [\App\Http\Controllers\TorneoController::class, 'getModalidades']);
        Route::post('eventos/{evento}/modalidades',       [\App\Http\Controllers\TorneoController::class, 'crearModalidad']);
        Route::delete('eventos/{evento}/modalidades/{modalidad}', [\App\Http\Controllers\TorneoController::class, 'eliminarModalidad']);
        Route::put('torneos/{torneoAlumnoId}/modalidades/{modalidad}/resultado', [\App\Http\Controllers\TorneoController::class, 'actualizarResultadoModalidad']);
        Route::post('torneos/{torneoAlumnoId}/modalidades', [\App\Http\Controllers\TorneoController::class, 'inscribirModalidad']);
        Route::post('configuraciones-cintas/reorder', [ConfiguracionCintaController::class, 'reorder']);
        Route::post('configuraciones-cintas/reset-default', [ConfiguracionCintaController::class, 'resetToDefault']);
        Route::apiResource('configuraciones-cintas', ConfiguracionCintaController::class);
        Route::apiResource('horarios', HorarioController::class);
        Route::apiResource('instructores', \App\Http\Controllers\InstructorController::class)->parameters([
            'instructores' => 'instructor'
        ]);
        Route::apiResource('users', \App\Http\Controllers\UserController::class)->middleware('role:owner');
        Route::post('users/{id}/toggle-suspension', [\App\Http\Controllers\UserController::class, 'toggleSuspension'])->middleware('role:owner');
        
        // Configuración de la Escuela (Perfiles y Direcciones)
        Route::get('/configuracion-escuela/status', [\App\Http\Controllers\EscuelaController::class, 'configStatus']);
        Route::post('/configuracion-escuela/confirmar-paso', [\App\Http\Controllers\EscuelaController::class, 'confirmarPaso']);
        Route::get('/configuracion-escuela', [\App\Http\Controllers\EscuelaController::class, 'show']);
        Route::post('/configuracion-escuela', [\App\Http\Controllers\EscuelaController::class, 'update']);
    });
});