<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * Listar usuarios del tenant actual.
     */
    public function index()
    {
        // El trait BelongsToTenant ya filtra por tenant_id
        return User::all();
    }

    /**
     * Crear un nuevo usuario para el equipo.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role'     => 'required|string|in:owner,admin,instructor,secretary',
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role'     => $validated['role'],
        ]);

        return response()->json($user, 201);
    }

    /**
     * Actualizar datos del usuario.
     */
    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name'     => 'sometimes|string|max:255',
            'email'    => 'sometimes|email|unique:users,email,' . $user->id,
            'password' => 'sometimes|nullable|string|min:6',
            'role'     => 'sometimes|string|in:owner,admin,instructor,secretary',
        ]);

        if (isset($validated['name'])) $user->name = $validated['name'];
        if (isset($validated['email'])) $user->email = $validated['email'];
        if (!empty($validated['password'])) $user->password = Hash::make($validated['password']);
        if (isset($validated['role'])) $user->role = $validated['role'];

        $user->save();

        return response()->json($user);
    }

    /**
     * Eliminar usuario (no puede eliminarse a sí mismo).
     */
    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'No puedes eliminarte a ti mismo'], 400);
        }

        $user->delete();
        return response()->json(['message' => 'Usuario eliminado correctamente']);
    }
}
