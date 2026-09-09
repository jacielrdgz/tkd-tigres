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
        $validated = $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'required|string|email|max:150|unique:users,email',
            'telefono' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\s()-]+$/'],
            'password' => 'required|string|min:6|max:100|confirmed',
            'escuela'  => 'required|string|max:150',
        ], [
            'email.unique'        => 'Este correo electrónico ya está registrado. Si ya tienes cuenta, inicia sesión.',
            'email.email'         => 'Ingresa un correo electrónico válido.',
            'email.required'      => 'El correo electrónico es obligatorio.',
            'name.required'       => 'Tu nombre es obligatorio.',
            'password.required'   => 'La contraseña es obligatoria.',
            'password.min'        => 'La contraseña debe tener al menos 6 caracteres.',
            'password.confirmed'  => 'Las contraseñas no coinciden.',
            'telefono.regex'      => 'El formato del teléfono no es válido.',
            'escuela.required'    => 'El nombre de tu escuela / academia es obligatorio.',
        ]);

        $emailClean = mb_strtolower(trim($validated['email']), 'UTF-8');

        // Guardar el nombre de la escuela solicitada en el campo escuela_solicitada
        // El tenant_id queda NULL — el admin lo asigna manualmente
        $user = User::create([
            'name'               => trim($validated['name']),
            'email'              => $emailClean,
            'telefono'           => !empty($validated['telefono']) ? trim($validated['telefono']) : null,
            'password'           => Hash::make($validated['password']),
            'role'               => 'secretario', // Rol inicial con mínimos privilegios
            'tenant_id'          => null, // Pendiente de aprobación
            'escuela_solicitada' => trim($validated['escuela']),
        ]);

        return response()->json([
            'message' => 'Solicitud recibida. Tu cuenta quedará activa con el rol adecuado una vez que sea revisada y aprobada por el administrador.',
        ], 201);
    }
}

