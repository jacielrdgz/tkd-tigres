<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Gate;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Schema::defaultStringLength(191);

        // Gate global: SuperAdmin y Owner tienen acceso completo
        Gate::before(function ($user, $ability) {
            if ($user->isSuperAdmin() || $user->role === 'owner') {
                return true;
            }
        });

        Gate::policy(\App\Models\Alumno::class, \App\Policies\AlumnoPolicy::class);
        Gate::policy(\App\Models\Pago::class, \App\Policies\PagoPolicy::class);
        Gate::policy(\App\Models\Evento::class, \App\Policies\EventoPolicy::class);

        // Sincronización de esquema removida del boot para evitar deadlocks/timeouts.
        // Se debe ejecutar manualmente mediante /api/ejecutar-migraciones.

        // Configuración de Rate Limiting para toda la API
        $this->configureRateLimiting();
    }

    /**
     * Configura el limitador de peticiones (Rate Limiting) para la API.
     * Limita por usuario autenticado (Sanctum) y por IP, retornando HTTP 429 con mensaje JSON.
     */
    protected function configureRateLimiting(): void
    {
        RateLimiter::for('api', function (Request $request) {
            $user = $request->user('sanctum') ?: $request->user();

            $limits = [];

            if ($user) {
                // 1. Límite por usuario autenticado (120 peticiones por minuto)
                $limits[] = Limit::perMinute(120)
                    ->by('user:' . $user->id)
                    ->response(function (Request $request, array $headers) {
                        return response()->json([
                            'status'      => 'error',
                            'code'        => 429,
                            'message'     => 'Has excedido el límite de peticiones permitido para tu cuenta. Por favor, espera un momento antes de continuar.',
                            'retry_after' => $headers['Retry-After'] ?? null,
                        ], Response::HTTP_TOO_MANY_REQUESTS, $headers);
                    });

                // 2. Límite amplio por IP para tráfico autenticado (300 peticiones por minuto)
                // Permite que múltiples instructores/usuarios compartiendo la misma red/WiFi trabajen sin bloquearse
                $limits[] = Limit::perMinute(300)
                    ->by('auth_ip:' . $request->ip())
                    ->response(function (Request $request, array $headers) {
                        return response()->json([
                            'status'      => 'error',
                            'code'        => 429,
                            'message'     => 'Demasiadas peticiones desde esta dirección IP. Por favor, intenta de nuevo más tarde.',
                            'retry_after' => $headers['Retry-After'] ?? null,
                        ], Response::HTTP_TOO_MANY_REQUESTS, $headers);
                    });
            } else {
                // 3. Límite para invitados / peticiones no autenticadas (60 peticiones por minuto por IP)
                $limits[] = Limit::perMinute(60)
                    ->by('guest_ip:' . $request->ip())
                    ->response(function (Request $request, array $headers) {
                        return response()->json([
                            'status'      => 'error',
                            'code'        => 429,
                            'message'     => 'Demasiadas peticiones desde esta dirección IP. Por favor, intenta de nuevo más tarde.',
                            'retry_after' => $headers['Retry-After'] ?? null,
                        ], Response::HTTP_TOO_MANY_REQUESTS, $headers);
                    });
            }

            return $limits;
        });
    }

    public function register(): void
    {
        //
    }
}