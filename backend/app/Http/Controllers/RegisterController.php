<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RegisterController extends Controller
{
    /**
     * Registro de nuevo usuario + creación de su escuela/dojo (tenant).
     * Este es el flujo de onboarding del SaaS.
     */
    public function register(Request $request)
    {
        $request->validate([
            'name'        => 'required|string|max:100',
            'email'       => 'required|email|unique:users,email',
            'password'    => 'required|string|min:6|confirmed',
            'escuela'     => 'required|string|max:150',
            'disciplina'  => 'nullable|string|max:50',
        ]);

        // 1. Crear el Tenant (escuela/dojo)
        $tenant = Tenant::create([
            'nombre'      => $request->escuela,
            'slug'        => Str::slug($request->escuela) . '-' . Str::random(4),
            'disciplina'  => $request->disciplina ?? 'taekwondo',
            'plan'        => 'free',
            'configuracion' => [
                'color_primario' => '#3b82f6',
                'moneda'         => 'MXN',
                'monto_mensual'  => 500,
            ],
        ]);

        // 2. Crear el usuario como owner del tenant
        $user = User::create([
            'name'      => $request->name,
            'email'     => $request->email,
            'password'  => Hash::make($request->password),
            'tenant_id' => $tenant->id,
            'role'      => 'owner',
        ]);

        // 3. Generar token
        $token = $user->createToken('tkd-token')->plainTextToken;

        return response()->json([
            'message' => 'Cuenta creada exitosamente',
            'token'   => $token,
            'user'    => $user->load('tenant'),
        ], 201);
    }
}
