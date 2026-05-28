<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckTenantStatus
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

        // Omitir si no hay usuario, es superadmin o no tiene tenant
        if (!$user || $user->isSuperAdmin() || !$user->tenant_id) {
            return $next($request);
        }

        $tenant = $user->tenant;
        if ($tenant && ($tenant->is_suspended || $tenant->suscripcion_estado === 'suspendida')) {
            return response()->json([
                'message' => 'El acceso para tu escuela está suspendido. Por favor, comunícate con el administrador general del sistema.'
            ], 403);
        }

        if ($user->is_suspended) {
            return response()->json([
                'message' => 'Tu cuenta de usuario ha sido suspendida. Contacta con el administrador de tu escuela.'
            ], 403);
        }

        return $next($request);
    }
}
