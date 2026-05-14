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
    'status' => 'ok',
    'app'    => 'DojoCloud',
    'version' => '2.0.0',
]));

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
    Route::get('/me',      [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Alumnos
    Route::get('alumnos/{alumno}/predecir-grado', [EventoAlumnoController::class, 'predecirGrado']);
    Route::patch('alumnos/{alumno}/toggle-estatus', [AlumnoController::class, 'toggleEstatus']);
    Route::apiResource('alumnos', AlumnoController::class);
    Route::patch('alumnos/{alumno}/quitar-foto', [AlumnoController::class, 'quitarFoto']);

    // Pagos
    Route::get('pagos/alumno/{alumno}', [PagoController::class, 'porAlumno']);
    Route::apiResource('pagos', PagoController::class);

    // Asistencias
    Route::get('asistencias', [AsistenciaController::class, 'index']);
    Route::post('asistencias/registrar-dia', [AsistenciaController::class, 'registrarDia']);
    Route::get('asistencias/alumno/{alumno}', [AsistenciaController::class, 'porAlumno']);

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
    Route::apiResource('configuraciones-cintas', ConfiguracionCintaController::class);
    Route::apiResource('horarios', HorarioController::class);
    Route::apiResource('instructores', \App\Http\Controllers\InstructorController::class)->parameters([
        'instructores' => 'instructor'
    ]);
    Route::apiResource('users', \App\Http\Controllers\UserController::class);
    
    // Configuración de la Escuela (Perfiles y Direcciones)
    Route::get('/configuracion-escuela', [\App\Http\Controllers\EscuelaController::class, 'show']);
    Route::post('/configuracion-escuela', [\App\Http\Controllers\EscuelaController::class, 'update']);
});