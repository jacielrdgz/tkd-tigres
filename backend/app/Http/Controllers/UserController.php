<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    /**
     * Listar usuarios del tenant actual.
     */
    public function index()
    {
        if (!auth()->user()->isOwner()) {
            return response()->json(['message' => 'No autorizado. Permisos insuficientes.'], 403);
        }

        // El trait BelongsToTenant ya filtra por tenant_id
        return User::all();
    }

    /**
     * Crear un nuevo usuario para el equipo.
     */
    public function store(Request $request)
    {
        if (!auth()->user()->isOwner()) {
            return response()->json(['message' => 'No autorizado. Permisos insuficientes.'], 403);
        }

        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role'     => 'required|string|in:owner,instructor,secretario',
        ]);

        $user = User::create([
            'name'      => $validated['name'],
            'email'     => $validated['email'],
            'password'  => Hash::make($validated['password']),
            'role'      => $validated['role'],
            'tenant_id' => auth()->user()->tenant_id,
        ]);

        return response()->json($user, 201);
    }

    /**
     * Actualizar datos del usuario.
     */
    public function update(Request $request, User $user)
    {
        if (!auth()->user()->isOwner()) {
            return response()->json(['message' => 'No autorizado. Permisos insuficientes.'], 403);
        }

        // Asegurarse de que el usuario a editar pertenece al mismo tenant
        if ($user->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'No encontrado'], 404);
        }

        $validated = $request->validate([
            'name'     => 'sometimes|string|max:255',
            'email'    => 'sometimes|email|unique:users,email,' . $user->id,
            'password' => 'sometimes|nullable|string|min:6',
            'role'     => 'sometimes|string|in:owner,instructor,secretario',
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
        if (!auth()->user()->isOwner()) {
            return response()->json(['message' => 'No autorizado. Permisos insuficientes.'], 403);
        }

        // Asegurarse de que el usuario a eliminar pertenece al mismo tenant
        if ($user->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'No encontrado'], 404);
        }

        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'No puedes eliminarte a ti mismo'], 400);
        }

        $user->delete();
        return response()->json(['message' => 'Usuario eliminado correctamente']);
    }

    /**
     * Subir foto de perfil del usuario autenticado.
     */
    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        $user = auth()->user();

        // Borrar avatar anterior si existe
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->avatar = $path;
        $user->save();

        return response()->json([
            'message' => 'Foto de perfil actualizada',
            'avatar'  => $path,
        ]);
    }

    /**
     * Eliminar foto de perfil del usuario autenticado.
     */
    public function quitarAvatar()
    {
        $user = auth()->user();

        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
            $user->avatar = null;
            $user->save();
        }

        return response()->json(['message' => 'Foto eliminada']);
    }
}
