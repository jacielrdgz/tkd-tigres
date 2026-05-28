<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Tenant;
use App\Mail\CuentaAprobadaMail;
use Illuminate\Support\Facades\Mail;

class SuperAdminController extends Controller
{
    // 1. Listar solicitudes pendientes
    public function pendientes()
    {
        // Usuarios con tenant_id null y que no son superadmin
        $pendientes = User::whereNull('tenant_id')
            ->where('is_superadmin', false)
            ->get();
            
        return response()->json($pendientes);
    }

    // Listar todos los tenants existentes
    public function tenants()
    {
        return response()->json(Tenant::all());
    }

    // 2. Aprobar una solicitud
    public function aprobar(Request $request, $id)
    {
        $request->validate([
            'action_type'    => 'required|in:new,existing',
            'role'           => 'required|in:owner,instructor,secretario',
            'nombre_escuela' => 'required_if:action_type,new|nullable|string|max:255',
            'tenant_id'      => 'required_if:action_type,existing|nullable|exists:tenants,id',
        ]);

        $user = User::findOrFail($id);

        if ($user->tenant_id !== null) {
            return response()->json(['message' => 'Este usuario ya fue aprobado.'], 400);
        }

        $tenantName = '';
        if ($request->action_type === 'new') {
            // Crear el tenant (escuela)
            $tenant = Tenant::create([
                'nombre' => $request->nombre_escuela,
                'slug'   => \Illuminate\Support\Str::slug($request->nombre_escuela),
            ]);
            $user->tenant_id = $tenant->id;
            $tenantName = $tenant->nombre;
        } else {
            // Usar tenant existente
            $tenant = Tenant::findOrFail($request->tenant_id);
            $user->tenant_id = $tenant->id;
            $tenantName = $tenant->nombre;
        }

        // Actualizar el usuario con el rol seleccionado
        $user->role = $request->role;
        $user->save();

        // Enviar correo de aprobación
        try {
            Mail::to($user->email)->send(new CuentaAprobadaMail($user->name, $tenantName));
        } catch (\Exception $e) {
            \Log::error('Error al enviar correo de cuenta aprobada: ' . $e->getMessage());
            // No detenemos el flujo si falla el correo
        }

        return response()->json(['message' => 'Escuela asignada y usuario aprobado exitosamente.']);
    }

    // 3. Rechazar (eliminar) una solicitud
    public function rechazar($id)
    {
        $user = User::findOrFail($id);
        
        if ($user->tenant_id !== null) {
            return response()->json(['message' => 'No puedes rechazar a un usuario que ya tiene escuela.'], 400);
        }

        $user->delete();

        return response()->json(['message' => 'Solicitud rechazada y usuario eliminado.']);
    }
}
