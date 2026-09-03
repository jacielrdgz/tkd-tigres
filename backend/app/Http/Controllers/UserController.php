<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\SupabaseStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    /**
     * Listar usuarios.
     */
    public function index()
    {
        if (!auth()->user()->isSuperAdmin() && !auth()->user()->isOwner()) {
            return response()->json(['message' => 'No autorizado. Permisos insuficientes.'], 403);
        }

        if (auth()->user()->isSuperAdmin()) {
            return User::with('tenant')->get();
        }

        // El trait BelongsToTenant ya filtra por tenant_id
        return User::all();
    }

    /**
     * Crear un nuevo usuario para el equipo.
     */
    public function store(Request $request)
    {
        $isSuper = auth()->user()->isSuperAdmin();
        if (!$isSuper && !auth()->user()->isOwner()) {
            return response()->json(['message' => 'No autorizado. Permisos insuficientes.'], 403);
        }

        $rules = [
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role'     => 'required|string|in:owner,instructor,secretario',
        ];

        if ($isSuper) {
            $rules['tenant_id'] = 'required|exists:tenants,id';
        }

        $validated = $request->validate($rules);

        $user = User::create([
            'name'      => $validated['name'],
            'email'     => $validated['email'],
            'password'  => Hash::make($validated['password']),
            'role'      => $validated['role'],
            'tenant_id' => $isSuper ? $validated['tenant_id'] : auth()->user()->tenant_id,
        ]);

        return response()->json($user, 201);
    }

    /**
     * Actualizar datos del usuario.
     */
    public function update(Request $request, User $user)
    {
        $isSuper = auth()->user()->isSuperAdmin();
        if (!$isSuper && !auth()->user()->isOwner()) {
            return response()->json(['message' => 'No autorizado. Permisos insuficientes.'], 403);
        }

        // Asegurarse de que el usuario a editar pertenece al mismo tenant (solo si no es SuperAdmin)
        if (!$isSuper && $user->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'No encontrado'], 404);
        }

        $rules = [
            'name'     => 'sometimes|string|max:255',
            'email'    => 'sometimes|email|unique:users,email,' . $user->id,
            'password' => 'sometimes|nullable|string|min:6',
            'role'     => 'sometimes|string|in:owner,instructor,secretario',
        ];

        if ($isSuper) {
            $rules['tenant_id'] = 'sometimes|exists:tenants,id';
        }

        $validated = $request->validate($rules);

        if (isset($validated['name'])) $user->name = $validated['name'];
        if (isset($validated['email'])) $user->email = $validated['email'];
        if (!empty($validated['password'])) $user->password = Hash::make($validated['password']);
        if (isset($validated['role'])) $user->role = $validated['role'];
        if ($isSuper && isset($validated['tenant_id'])) $user->tenant_id = $validated['tenant_id'];

        $user->save();

        return response()->json($user);
    }

    /**
     * Eliminar usuario (no puede eliminarse a sí mismo).
     */
    public function destroy(User $user)
    {
        $isSuper = auth()->user()->isSuperAdmin();
        if (!$isSuper && !auth()->user()->isOwner()) {
            return response()->json(['message' => 'No autorizado. Permisos insuficientes.'], 403);
        }

        // Asegurarse de que el usuario a eliminar pertenece al mismo tenant (solo si no es SuperAdmin)
        if (!$isSuper && $user->tenant_id !== auth()->user()->tenant_id) {
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
            'avatar' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $user = auth()->user();

        // Borrar avatar anterior si existe
        if ($user->avatar) {
            SupabaseStorageService::delete($user->avatar);
        }

        $tenantNombre = $user->tenant?->nombre ?? 'tigres-do';
        $avatarUrl = SupabaseStorageService::upload(
            $request->file('avatar'), 
            'avatars', 
            'avatar_user_' . $user->id . '_' . time() . '.' . ($request->file('avatar')->getClientOriginalExtension() ?: 'jpg'),
            $tenantNombre
        );

        $user->avatar = $avatarUrl;
        $user->save();

        return response()->json([
            'message' => 'Foto de perfil actualizada',
            'avatar'  => $avatarUrl,
        ]);
    }

    /**
     * Eliminar foto de perfil del usuario autenticado.
     */
    public function quitarAvatar()
    {
        $user = auth()->user();

        if ($user->avatar) {
            SupabaseStorageService::delete($user->avatar);
            $user->avatar = null;
            $user->save();
        }

        return response()->json(['message' => 'Foto eliminada']);
    }

    /**
     * Activar o suspender cuenta de usuario del equipo.
     */
    public function toggleSuspension($id)
    {
        $currentUser = auth()->user();
        if (!$currentUser->isOwner()) {
            return response()->json(['message' => 'No autorizado. Permisos insuficientes.'], 403);
        }

        $user = User::findOrFail($id);

        // Asegurarse de que el usuario pertenece al mismo tenant
        if ($user->tenant_id !== $currentUser->tenant_id) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }

        // El owner no puede suspender su propia cuenta
        if ($user->id === $currentUser->id) {
            return response()->json(['message' => 'No puedes suspender tu propia cuenta.'], 400);
        }

        // Solo permitir suspender rangos menores (instructor, secretario)
        if ($user->role === 'owner') {
            return response()->json(['message' => 'No puedes suspender a otro Administrador.'], 403);
        }

        $user->is_suspended = !$user->is_suspended;
        $user->save();

        $status = $user->is_suspended ? 'suspendido' : 'activo';
        return response()->json([
            'message'      => "Usuario {$status} correctamente.",
            'is_suspended' => $user->is_suspended
        ]);
    }
}
