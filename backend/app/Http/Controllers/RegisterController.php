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
            'telefono' => 'nullable|string|max:25',
            'password' => 'required|string|min:6|confirmed',
            'escuela'  => 'required|string|max:150',
        ], [
            'email.unique'        => 'Este correo electrónico ya está registrado. Si ya tienes cuenta, inicia sesión.',
            'email.email'         => 'Ingresa un correo electrónico válido.',
            'email.required'      => 'El correo electrónico es obligatorio.',
            'name.required'       => 'Tu nombre es obligatorio.',
            'password.required'   => 'La contraseña es obligatoria.',
            'password.min'        => 'La contraseña debe tener al menos 6 caracteres.',
            'password.confirmed'  => 'Las contraseñas no coinciden.',
            'escuela.required'    => 'El nombre de tu escuela / academia es obligatorio.',
        ]);

        // Guardar el nombre de la escuela solicitada en el campo escuela_solicitada
        // El tenant_id queda NULL — el admin lo asigna manualmente
        $user = User::create([
            'name'               => $request->name,
            'email'              => $request->email,
            'telefono'           => $request->telefono,
            'password'           => Hash::make($request->password),
            'role'               => 'secretario', // Rol inicial con mínimos privilegios
            'tenant_id'          => null, // Pendiente de aprobación
            'escuela_solicitada' => $request->escuela,
        ]);

        return response()->json([
            'message' => 'Solicitud recibida. Tu cuenta quedará activa con el rol adecuado una vez que sea revisada y aprobada por el administrador.',
        ], 201);
    }
}

