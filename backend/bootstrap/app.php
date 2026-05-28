<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

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
        ]);
        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
            \App\Http\Middleware\CheckMaintenanceMode::class,
            \App\Http\Middleware\CheckTenantStatus::class,
        ]);

// $middleware->statefulApi(); // ← comentado porque usamos Bearer tokens, no cookies de sesión
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();