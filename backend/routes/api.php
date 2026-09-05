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
        // 1. DDL directo para corregir columnas críticas inmediatamente
        $ddlReport = [];
        try {
            \Illuminate\Support\Facades\DB::statement('ALTER TABLE alumnos ALTER COLUMN nombre_tutor DROP NOT NULL');
            $ddlReport[] = 'nombre_tutor drop not null: ok';
        } catch (\Throwable $e) { $ddlReport[] = 'nombre_tutor: ' . $e->getMessage(); }

        try {
            \Illuminate\Support\Facades\DB::statement('ALTER TABLE alumnos ALTER COLUMN telefono_tutor DROP NOT NULL');
            $ddlReport[] = 'telefono_tutor drop not null: ok';
        } catch (\Throwable $e) { $ddlReport[] = 'telefono_tutor: ' . $e->getMessage(); }

        try {
            \Illuminate\Support\Facades\DB::statement('ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS fecha_ingreso DATE NULL');
            $ddlReport[] = 'fecha_ingreso add column: ok';
        } catch (\Throwable $e) { $ddlReport[] = 'fecha_ingreso: ' . $e->getMessage(); }

        try {
            \Illuminate\Support\Facades\DB::statement('ALTER TABLE eventos ADD COLUMN IF NOT EXISTS precios_cintas JSON NULL');
            $ddlReport[] = 'precios_cintas add column: ok';
        } catch (\Throwable $e) { $ddlReport[] = 'precios_cintas: ' . $e->getMessage(); }

        try {
            \Illuminate\Support\Facades\DB::statement('ALTER TABLE eventos ADD COLUMN IF NOT EXISTS lugar VARCHAR(200) NULL');
            $ddlReport[] = 'lugar add column: ok';
        } catch (\Throwable $e) { $ddlReport[] = 'lugar: ' . $e->getMessage(); }

        try {
            \Illuminate\Support\Facades\DB::statement('ALTER TABLE eventos ADD COLUMN IF NOT EXISTS costo NUMERIC(10,2) NULL');
            $ddlReport[] = 'costo add column: ok';
        } catch (\Throwable $e) { $ddlReport[] = 'costo: ' . $e->getMessage(); }

        try {
            \Illuminate\Support\Facades\DB::statement('CREATE INDEX IF NOT EXISTS asistencias_fecha_idx ON asistencias(fecha)');
            $ddlReport[] = 'index asistencias fecha: ok';
        } catch (\Throwable $e) { $ddlReport[] = 'index asistencias: ' . $e->getMessage(); }

        try {
            \Illuminate\Support\Facades\DB::statement('CREATE INDEX IF NOT EXISTS pagos_alumno_id_idx ON pagos(alumno_id)');
            \Illuminate\Support\Facades\DB::statement('CREATE INDEX IF NOT EXISTS pagos_alumno_fecha_inicio_idx ON pagos(alumno_id, fecha_inicio)');
            $ddlReport[] = 'indexes pagos: ok';
        } catch (\Throwable $e) { $ddlReport[] = 'indexes pagos: ' . $e->getMessage(); }

        // 2. Registrar migraciones base
        if (!\Illuminate\Support\Facades\Schema::hasTable('migrations')) {
            \Illuminate\Support\Facades\DB::statement('
                CREATE TABLE IF NOT EXISTS migrations (
                    id SERIAL PRIMARY KEY,
                    migration VARCHAR(255) NOT NULL,
                    batch INTEGER NOT NULL
                )
            ');
        }

        $tableToMigration = [
            'users'                  => '0001_01_01_000000_create_users_table',
            'cache'                  => '0001_01_01_000001_create_cache_table',
            'jobs'                   => '0001_01_01_000002_create_jobs_table',
            'personal_access_tokens' => '2026_04_12_190923_create_personal_access_tokens_table',
            'alumnos'                => '2026_04_12_191309_create_alumnos_table',
            'asistencias'            => '2026_04_12_191342_create_asistencias_table',
            'eventos'                => '2026_04_12_191349_create_eventos_table',
            'evento_alumno'          => '2026_04_12_191357_create_evento_alumno_table',
            'pagos'                  => '2026_04_13_042851_create_pagos_table',
            'tenants'                => '2026_04_16_000001_create_tenants_table',
            'configuraciones_cintas' => '2026_04_21_174516_create_configuraciones_cintas_table',
            'horarios'               => '2026_04_24_011124_create_horarios_table',
            'instructors'            => '2026_05_07_063413_create_instructors_table',
            'escuelas'               => '2026_05_07_075644_create_escuelas_table',
            'direcciones_escuelas'   => '2026_05_07_075709_create_direcciones_escuelas_table',
            'examen_alumno'          => '2026_05_14_000001_refactor_eventos_relacional',
            'global_configs'         => '2026_05_27_000758_create_global_configs_table',
            'suscripcion_historials' => '2026_05_27_000932_create_suscripcion_historials_table',
        ];

        $existing = \Illuminate\Support\Facades\DB::table('migrations')->pluck('migration')->toArray();

        foreach ($tableToMigration as $table => $migrationName) {
            if (\Illuminate\Support\Facades\Schema::hasTable($table) && !in_array($migrationName, $existing)) {
                \Illuminate\Support\Facades\DB::table('migrations')->insert([
                    'migration' => $migrationName,
                    'batch'     => 1,
                ]);
                $existing[] = $migrationName;
            }
        }

        $pre2026Sept = [
            '2026_04_13_165246_add_foto_to_alumnos_table',
            '2026_04_15_060523_add_horario_to_alumnos_table',
            '2026_04_16_000002_add_tenant_id_to_all_tables',
            '2026_04_16_235959_backfill_tenant_id_on_existing_records',
            '2026_04_23_190722_alter_cinta_to_configuracion_cinta_id_on_alumnos_table',
            '2026_04_23_193612_add_color_texto_to_configuraciones_cintas_table',
            '2026_04_23_194702_add_color_texto_to_configuraciones_cintas_table',
            '2026_04_24_013453_add_horario_id_to_alumnos_table',
            '2026_04_24_014106_drop_horario_column_from_alumnos_table',
            '2026_05_07_000001_add_dia_pago_to_alumnos_table',
            '2026_05_07_000002_add_periodo_to_pagos_table',
            '2026_05_07_064516_add_details_to_tenants_table',
            '2026_05_07_072622_add_extra_fields_to_instructors_table',
            '2026_05_12_000001_add_tipo_to_pagos_table',
            '2026_05_12_000003_add_detalles_to_eventos_and_pivot',
            '2026_05_14_055554_add_es_historico_to_examen_alumnos_table',
            '2026_05_14_064143_normalize_event_tables',
            '2026_05_14_064629_sync_pago_inscripcion_amounts',
            '2026_05_14_070845_simplify_evento_alumno_table',
            '2026_05_26_224954_add_avatar_to_users_table',
            '2026_05_26_232805_add_is_superadmin_to_users_table',
            '2026_05_26_234535_add_escuela_solicitada_to_users_table',
            '2026_05_27_000823_add_subscription_fields_to_tenants_table',
            '2026_05_27_000853_add_last_login_and_suspension_to_users_table',
            '2026_08_26_014000_change_foto_columns_to_text',
            '2026_08_26_020000_ensure_superadmin_has_no_tenant',
            '2026_08_26_100000_add_telefono_to_users_table',
        ];

        foreach ($pre2026Sept as $mig) {
            if (!in_array($mig, $existing)) {
                \Illuminate\Support\Facades\DB::table('migrations')->insert([
                    'migration' => $mig,
                    'batch'     => 1,
                ]);
                $existing[] = $mig;
            }
        }

        // 3. Ejecutar migrate
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        $outputMigrate = \Illuminate\Support\Facades\Artisan::output();

        // Limpiar tenant_id de todos los superadmins en base de datos
        \Illuminate\Support\Facades\DB::table('users')
            ->where('is_superadmin', true)
            ->update(['tenant_id' => null]);

        return response()->json([
            'status' => 'success',
            'message' => 'Migraciones y esquema sincronizados con éxito.',
            'ddl_report' => $ddlReport,
            'migrate_output' => $outputMigrate,
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
        Route::post('eventos/{evento}/inscribir-masivo', [\App\Http\Controllers\EventoAlumnoController::class, 'inscribirMasivo']);
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