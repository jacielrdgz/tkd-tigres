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
    Route::patch('alumnos/{alumno}/toggle-estatus', [AlumnoController::class, 'toggleEstatus']);
    Route::apiResource('alumnos', AlumnoController::class);
    Route::patch('alumnos/{alumno}/quitar-foto', [AlumnoController::class, 'quitarFoto']);

    // Pagos
    Route::apiResource('pagos', PagoController::class);

    // Asistencias
    Route::get('asistencias', [AsistenciaController::class, 'index']);
    Route::post('asistencias/registrar-dia', [AsistenciaController::class, 'registrarDia']);
    Route::get('asistencias/alumno/{alumno}', [AsistenciaController::class, 'porAlumno']);

    // Eventos
    Route::apiResource('eventos', EventoController::class);
    Route::apiResource('configuraciones-cintas', ConfiguracionCintaController::class);
});