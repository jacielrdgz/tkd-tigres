<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class RegisterController extends Controller
{
    /**
     * Registro de solicitud de cuenta nueva.
     * El usuario queda sin tenant_id hasta que el administrador lo aprueba y asigna escuela.
     */
    public function register(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
            'escuela'  => 'required|string|max:150',
        ]);

        // Guardar el nombre de la escuela solicitada en un campo temporal (como nota)
        // El tenant_id queda NULL — el admin lo asigna manualmente
        User::create([
            'name'      => $request->name,
            'email'     => $request->email,
            'password'  => Hash::make($request->password),
            'role'      => 'owner',
            'tenant_id' => null, // Pendiente de aprobación
        ]);

        return response()->json([
            'message' => 'Solicitud recibida. Tu cuenta quedará activa una vez que sea revisada y aprobada por el administrador.',
        ], 201);
    }
}

