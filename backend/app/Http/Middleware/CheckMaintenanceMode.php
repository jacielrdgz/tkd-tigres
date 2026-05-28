<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\GlobalConfig;

class CheckMaintenanceMode
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Omitir rutas públicas y de autenticación
        if ($request->is('api/login') || $request->is('api/register') || $request->is('api/ping') || $request->is('ping') || $request->is('login')) {
            return $next($request);
        }

        // Resolver usuario mediante Sanctum
        $user = auth('sanctum')->user();

        // Si el usuario es superadmin, omitimos el mantenimiento
        if ($user && $user->isSuperAdmin()) {
            return $next($request);
        }

        $config = GlobalConfig::first();
        if ($config && $config->modo_mantenimiento) {
            return response()->json([
                'message' => $config->modo_mantenimiento_mensaje ?: 'El sistema se encuentra en mantenimiento programado. Volveremos pronto.'
            ], 503);
        }

        return $next($request);
    }
}
