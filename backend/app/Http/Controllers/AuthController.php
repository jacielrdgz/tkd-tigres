<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Login — devuelve token Sanctum + datos del usuario + tenant.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Credenciales incorrectas'
            ], 401);
        }

        // 1. Verificar si el usuario está suspendido
        if ($user->is_suspended) {
            return response()->json([
                'message' => 'Tu cuenta de usuario ha sido suspendida. Contacta con el administrador de tu escuela.'
            ], 403);
        }

        // 2. Verificar si el tenant está suspendido (excepto SuperAdmin)
        if (!$user->isSuperAdmin() && $user->tenant_id) {
            $tenant = $user->tenant;
            if ($tenant && ($tenant->is_suspended || $tenant->suscripcion_estado === 'suspendida')) {
                return response()->json([
                    'message' => 'El acceso para tu escuela está suspendido. Por favor, comunícate con el administrador general del sistema.'
                ], 403);
            }
        }

        // 3. Verificar modo mantenimiento (excepto SuperAdmin)
        if (!$user->isSuperAdmin()) {
            $config = \App\Models\GlobalConfig::first();
            if ($config && $config->modo_mantenimiento) {
                return response()->json([
                    'message' => $config->modo_mantenimiento_mensaje ?: 'El sistema se encuentra en mantenimiento programado. Volveremos pronto.'
                ], 503);
            }
        }

        // Registrar último acceso
        $user->last_login_at = now();
        $user->save();

        $token = $user->createToken('tkd-token')->plainTextToken;

        if (!$user->tenant_id || !$user->tenant) {
            $tenant = \App\Models\Tenant::first();
            if (!$tenant) {
                $tenantName = $user->escuela_solicitada ?: 'Mi Escuela';
                $tenant = \App\Models\Tenant::create([
                    'nombre' => $tenantName,
                    'slug' => 'escuela-' . time(),
                    'plan' => 'pro',
                    'suscripcion_estado' => 'activa',
                ]);
            }
            $user->tenant_id = $tenant->id;
            $user->save();
        }

        return response()->json([
            'token'  => $token,
            'user'   => $user->load('tenant'),
        ]);
    }

    /**
     * Logout — revoca el token actual.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Sesión cerrada'
        ]);
    }

    /**
     * Me — devuelve el usuario autenticado con su tenant.
     */
    public function me(Request $request)
    {
        $user = $request->user();
        if (!$user->tenant_id || !$user->tenant) {
            $tenant = \App\Models\Tenant::first();
            if (!$tenant) {
                $tenantName = $user->escuela_solicitada ?: 'Mi Escuela';
                $tenant = \App\Models\Tenant::create([
                    'nombre' => $tenantName,
                    'slug' => 'escuela-' . time(),
                    'plan' => 'pro',
                    'suscripcion_estado' => 'activa',
                ]);
            }
            $user->tenant_id = $tenant->id;
            $user->save();
        }

        return response()->json(
            $user->load('tenant')
        );
    }
}