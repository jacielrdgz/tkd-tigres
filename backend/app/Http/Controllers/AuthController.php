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

        // 2. Verificar si el tenant está suspendido o vencido (excepto SuperAdmin)
        if (!$user->isSuperAdmin() && $user->tenant_id) {
            $tenant = $user->tenant;
            if ($tenant) {
                // Si la fecha de vencimiento es nula, inicializar por defecto a 1 mes
                if (!$tenant->suscripcion_hasta) {
                    $tenant->suscripcion_hasta = $tenant->created_at 
                        ? $tenant->created_at->copy()->addMonth()->toDateString() 
                        : \Carbon\Carbon::now()->addMonth()->toDateString();
                    $tenant->suscripcion_estado = $tenant->suscripcion_estado ?: 'activa';
                    $tenant->save();
                }

                $estaVencido = $tenant->suscripcion_hasta && \Carbon\Carbon::parse($tenant->suscripcion_hasta)->endOfDay()->isPast();
                
                if ($estaVencido || $tenant->suscripcion_estado === 'cancelada') {
                    $fechaFormateada = $tenant->suscripcion_hasta 
                        ? \Carbon\Carbon::parse($tenant->suscripcion_hasta)->format('d/m/Y') 
                        : 'recientemente';
                    return response()->json([
                        'message' => "La suscripción de tu escuela venció el {$fechaFormateada}. Comunícate con el administrador global para renovar tu acceso.",
                        'subscription_expired' => true
                    ], 403);
                }

                if ($tenant->is_suspended || $tenant->suscripcion_estado === 'suspendida') {
                    return response()->json([
                        'message' => 'El acceso para tu escuela está suspendido. Por favor, comunícate con el administrador general del sistema.',
                        'school_suspended' => true
                    ], 403);
                }
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

        // 4. Manejo de Tenant según tipo de usuario
        if ($user->isSuperAdmin()) {
            // El SuperAdmin no pertenece a ninguna escuela
            if ($user->tenant_id !== null) {
                $user->tenant_id = null;
                $user->save();
            }
        } else {
            // Usuario regular: verificar si su solicitud está pendiente de aprobación
            if ($user->tenant_id === null) {
                return response()->json([
                    'message' => 'Tu solicitud de registro aún está pendiente de revisión y aprobación por el administrador global.'
                ], 403);
            }

            // Sincronizar tenant con escuela si existe
            if ($user->tenant) {
                $escuela = \App\Models\Escuela::where('tenant_id', $user->tenant->id)->first();
                if ($escuela) {
                    $cambios = false;
                    if (!empty($escuela->nombre) && $escuela->nombre !== $user->tenant->nombre) {
                        $user->tenant->nombre = $escuela->nombre;
                        $cambios = true;
                    }
                    if (!empty($escuela->logo_url) && $escuela->logo_url !== $user->tenant->logo) {
                        $user->tenant->logo = $escuela->logo_url;
                        $cambios = true;
                    }
                    if ($cambios) {
                        $user->tenant->save();
                    }
                }
            }
        }

        return response()->json([
            'token'  => $token,
            'user'   => $user->isSuperAdmin() ? $user : $user->load('tenant'),
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

        if ($user->isSuperAdmin()) {
            if ($user->tenant_id !== null) {
                $user->tenant_id = null;
                $user->save();
            }
            return response()->json($user);
        }

        if ($user->tenant_id === null) {
            return response()->json([
                'message' => 'Tu cuenta aún no tiene una escuela asignada.'
            ], 403);
        }

        // Sincronizar tenant con escuela si existe
        if ($user->tenant) {
            $escuela = \App\Models\Escuela::where('tenant_id', $user->tenant->id)->first();
            if ($escuela) {
                $cambios = false;
                if (!empty($escuela->nombre) && $escuela->nombre !== $user->tenant->nombre) {
                    $user->tenant->nombre = $escuela->nombre;
                    $cambios = true;
                }
                if (!empty($escuela->logo_url) && $escuela->logo_url !== $user->tenant->logo) {
                    $user->tenant->logo = $escuela->logo_url;
                    $cambios = true;
                }
                if ($cambios) {
                    $user->tenant->save();
                }
            }
        }

        return response()->json(
            $user->load('tenant')
        );
    }
}