<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireTenant
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Si el usuario no está autenticado, es superadmin o no tiene un tenant_id asociado, bloquear acceso
        if (!$user || $user->isSuperAdmin() || !$user->tenant_id) {
            return response()->json([
                'message' => 'Acceso denegado. Esta ruta requiere pertenecer a una escuela/academia específica.'
            ], 403);
        }

        return $next($request);
    }
}
