<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role'       => \App\Http\Middleware\CheckRole::class,
            'superadmin' => \App\Http\Middleware\CheckSuperAdmin::class,
            'tenant'     => \App\Http\Middleware\RequireTenant::class,
        ]);
        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
            \App\Http\Middleware\SanitizeInput::class,
            \App\Http\Middleware\CheckMaintenanceMode::class,
            \App\Http\Middleware\CheckTenantStatus::class,
        ]);

        $middleware->throttleApi('api');

// $middleware->statefulApi(); // ← comentado porque usamos Bearer tokens, no cookies de sesión
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'status'      => 'error',
                    'code'        => 429,
                    'message'     => 'Demasiadas peticiones. Por favor, espera un momento antes de reintentar.',
                    'retry_after' => $e->getHeaders()['Retry-After'] ?? null,
                ], 429, $e->getHeaders());
            }
        });
    })->create();