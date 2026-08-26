<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Tenant;
use App\Models\Escuela;
use App\Models\GlobalConfig;
use App\Mail\CuentaAprobadaMail;
use App\Mail\SolicitudRechazadaMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Services\DefaultCintasService;

class AdminSolicitudController extends Controller
{
    /**
     * Listar solicitudes de registro pendientes.
     */
    public function index()
    {
        $solicitudes = User::withoutGlobalScopes()
            ->whereNull('tenant_id')
            ->where('is_superadmin', false)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($solicitudes);
    }

    /**
     * Aprobar una solicitud.
     */
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

        // Obtener configuraciones globales para trial y precio
        $config = GlobalConfig::first();
        $diasTrial = $config ? $config->dias_trial : 30;
        $precioPlan = $config ? $config->precio_plan_mensual : 500.00;

        $tenantName = '';

        if ($request->action_type === 'new') {
            // Crear el tenant (escuela)
            $tenant = Tenant::create([
                'nombre'             => $request->nombre_escuela,
                'slug'               => Str::slug($request->nombre_escuela),
                'plan'               => 'free',
                'suscripcion_estado' => 'trial',
                'suscripcion_hasta'  => now()->addDays($diasTrial)->toDateString(),
                'suscripcion_monto'  => $precioPlan,
            ]);

            // Inicializar el perfil de la escuela en la tabla escuelas
            Escuela::create([
                'tenant_id'      => $tenant->id,
                'nombre'         => $tenant->nombre,
                'titular'        => $user->name,
                'email_contacto' => $user->email,
                'disciplina'     => 'taekwondo',
            ]);

            // Crear cintas por defecto para la nueva escuela
            DefaultCintasService::crearCintasPorDefecto($tenant->id);

            $user->tenant_id = $tenant->id;
            $tenantName = $tenant->nombre;
        } else {
            // Usar tenant existente
            $tenant = Tenant::findOrFail($request->tenant_id);
            $user->tenant_id = $tenant->id;
            $tenantName = $tenant->nombre;
        }

        // Guardar rol seleccionado
        $user->role = $request->role;
        $user->save();

        // Enviar correo de cuenta aprobada
        try {
            Mail::to($user->email)->send(new CuentaAprobadaMail($user->name, $tenantName));
        } catch (\Exception $e) {
            \Log::error('Error al enviar correo de cuenta aprobada: ' . $e->getMessage());
        }

        return response()->json(['message' => 'Solicitud aprobada y escuela asignada con éxito.']);
    }

    /**
     * Rechazar una solicitud con motivo.
     */
    public function rechazar(Request $request, $id)
    {
        $request->validate([
            'motivo' => 'required|string|max:500',
        ]);

        $user = User::findOrFail($id);

        if ($user->tenant_id !== null) {
            return response()->json(['message' => 'No puedes rechazar a un usuario que ya tiene escuela.'], 400);
        }

        $userEmail = $user->email;
        $userName = $user->name;

        // Eliminar el usuario
        $user->delete();

        // Enviar correo de rechazo con motivo
        try {
            Mail::to($userEmail)->send(new SolicitudRechazadaMail($userName, $request->motivo));
        } catch (\Exception $e) {
            \Log::error('Error al enviar correo de rechazo: ' . $e->getMessage());
        }

        return response()->json(['message' => 'Solicitud rechazada y eliminada. Se ha notificado al usuario por correo.']);
    }
}
