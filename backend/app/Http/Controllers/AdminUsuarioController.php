<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminUsuarioController extends Controller
{
    /**
     * Listar todos los usuarios con filtros.
     */
    public function index(Request $request)
    {
        $query = User::with('tenant');

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->tenant_id);
        }

        if ($request->filled('estado')) {
            $isSuspended = $request->estado === 'suspendido';
            $query->where('is_suspended', $isSuspended);
        }

        $usuarios = $query->get()->map(function ($u) {
            return [
                'id'             => $u->id,
                'name'           => $u->name,
                'email'          => $u->email,
                'role'           => $u->role,
                'is_superadmin'  => $u->is_superadmin,
                'is_suspended'   => $u->is_suspended,
                'last_login_at'  => $u->last_login_at,
                'tenant_id'      => $u->tenant_id,
                'escuela_nombre' => $u->tenant ? $u->tenant->nombre : ($u->is_superadmin ? 'Sistema / Global' : 'Pendiente'),
            ];
        });

        return response()->json($usuarios);
    }

    /**
     * Resetear la contraseña de un usuario.
     */
    public function resetPassword(Request $request, $id)
    {
        $request->validate([
            'password' => 'required|string|min:6',
        ]);

        $user = User::findOrFail($id);
        $user->password = Hash::make($request->password);
        $user->save();

        return response()->json(['message' => 'Contraseña reestablecida correctamente.']);
    }

    /**
     * Activar o suspender cuenta de usuario.
     */
    public function toggleSuspension($id)
    {
        $user = User::findOrFail($id);

        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'No puedes suspender tu propia cuenta.'], 400);
        }

        $user->is_suspended = !$user->is_suspended;
        $user->save();

        $status = $user->is_suspended ? 'suspendido' : 'activo';
        return response()->json([
            'message'      => "Usuario {$status} correctamente.",
            'is_suspended' => $user->is_suspended
        ]);
    }

    /**
     * Cambiar el rol de un usuario.
     */
    public function cambiarRol(Request $request, $id)
    {
        $request->validate([
            'role' => 'required|in:owner,instructor,secretario',
        ]);

        $user = User::findOrFail($id);
        $user->role = $request->role;
        $user->save();

        return response()->json([
            'message' => 'Rol actualizado correctamente.',
            'role'    => $user->role
        ]);
    }

    /**
     * Cambiar la escuela (tenant) de un usuario.
     */
    public function cambiarEscuela(Request $request, $id)
    {
        $request->validate([
            'tenant_id' => 'required|exists:tenants,id',
        ]);

        $user = User::findOrFail($id);

        if ($user->is_superadmin) {
            return response()->json(['message' => 'No puedes cambiar la escuela de un SuperAdmin.'], 400);
        }

        $user->tenant_id = $request->tenant_id;
        $user->save();

        $tenant = \App\Models\Tenant::find($request->tenant_id);

        return response()->json([
            'message' => "Usuario reasignado a '{$tenant->nombre}' correctamente.",
            'tenant_id' => $user->tenant_id,
            'escuela_nombre' => $tenant->nombre,
        ]);
    }

    /**
     * Eliminar un usuario permanentemente.
     */
    public function destroy($id)
    {
        $user = User::findOrFail($id);

        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'No puedes eliminar tu propia cuenta.'], 400);
        }

        if ($user->is_superadmin) {
            return response()->json(['message' => 'No puedes eliminar a un SuperAdmin.'], 400);
        }

        // Revocar todos los tokens del usuario
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Usuario eliminado permanentemente.']);
    }
}
