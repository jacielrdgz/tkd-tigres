<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tenant;
use App\Models\User;
use App\Models\SuscripcionHistorial;
use Carbon\Carbon;

class AdminSuscripcionController extends Controller
{
    /**
     * Listado de suscripciones con filtros.
     */
    public function index(Request $request)
    {
        $query = Tenant::with('escuela');

        if ($request->filled('estado')) {
            $query->where('suscripcion_estado', $request->estado);
        }

        if ($request->filled('mes_vencimiento')) {
            $query->whereMonth('suscripcion_hasta', $request->mes_vencimiento);
        }

        $suscripciones = $query->get()->map(function ($tenant) {
            // Buscar dueño / titular de la escuela
            $owner = User::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->where('role', 'owner')
                ->first();

            $titular = ($tenant->escuela && !empty($tenant->escuela->titular))
                ? $tenant->escuela->titular
                : ($owner ? $owner->name : 'Sin titular asignado');

            $nombreEscuela = ($tenant->escuela && !empty($tenant->escuela->nombre))
                ? $tenant->escuela->nombre
                : $tenant->nombre;

            // Si la fecha de vencimiento es nula, asignar por defecto 1 mes desde creación o fecha actual
            if (!$tenant->suscripcion_hasta) {
                $tenant->suscripcion_hasta = $tenant->created_at 
                    ? $tenant->created_at->copy()->addMonth()->toDateString() 
                    : Carbon::now()->addMonth()->toDateString();
                $tenant->suscripcion_estado = $tenant->suscripcion_estado ?: 'activa';
                $tenant->save();
            }

            $diasRestantes = 0;
            if ($tenant->suscripcion_hasta) {
                $venc = Carbon::parse($tenant->suscripcion_hasta)->endOfDay();
                $diasRestantes = Carbon::now()->startOfDay()->diffInDays($venc, false);
            }

            return [
                'id'                 => $tenant->id,
                'nombre'             => $nombreEscuela,
                'owner_name'         => $titular,
                'owner_email'        => $owner ? $owner->email : '',
                'plan'               => $tenant->plan,
                'suscripcion_estado' => $tenant->suscripcion_estado,
                'suscripcion_hasta'  => $tenant->suscripcion_hasta ? Carbon::parse($tenant->suscripcion_hasta)->toDateString() : null,
                'suscripcion_monto'  => (float)$tenant->suscripcion_monto,
                'is_suspended'       => $tenant->is_suspended,
                'dias_restantes'     => $diasRestantes,
            ];
        });

        return response()->json($suscripciones);
    }

    /**
     * Renovar o fijar manualmente la fecha de vencimiento de una suscripción.
     */
    public function renovar(Request $request, $id)
    {
        $request->validate([
            'monto'             => 'nullable|numeric|min:0',
            'tipo_renovacion'   => 'nullable|in:meses,fecha',
            'meses'             => 'nullable|integer|min:1|max:60',
            'fecha_vencimiento' => 'nullable|date',
        ]);

        $tenant = Tenant::findOrFail($id);

        if ($request->tipo_renovacion === 'fecha' && $request->filled('fecha_vencimiento')) {
            $nuevaFecha = Carbon::parse($request->fecha_vencimiento)->toDateString();
        } else {
            $meses = $request->meses ?: 1;
            $baseFecha = Carbon::now();
            if ($tenant->suscripcion_hasta && Carbon::parse($tenant->suscripcion_hasta)->isFuture()) {
                $baseFecha = Carbon::parse($tenant->suscripcion_hasta);
            }
            $nuevaFecha = $baseFecha->addMonths($meses)->toDateString();
        }

        $monto = $request->filled('monto') ? $request->monto : ($tenant->suscripcion_monto ?: 500);

        // Actualizar el tenant
        $tenant->suscripcion_estado = 'activa';
        $tenant->suscripcion_hasta = $nuevaFecha;
        $tenant->suscripcion_monto = $monto;
        $tenant->is_suspended = false;
        $tenant->save();

        // Registrar en el historial de suscripciones
        SuscripcionHistorial::create([
            'tenant_id'    => $tenant->id,
            'plan'         => $tenant->plan,
            'monto'        => $monto,
            'fecha_pago'   => Carbon::now()->toDateString(),
            'valido_hasta' => $nuevaFecha,
        ]);

        return response()->json([
            'message'            => 'Suscripción actualizada exitosamente.',
            'suscripcion_hasta'  => $nuevaFecha,
            'suscripcion_estado' => 'activa',
        ]);
    }

    /**
     * Cambiar plan y monto acordado de suscripción.
     */
    public function cambiarPlan(Request $request, $id)
    {
        $request->validate([
            'plan'  => 'required|in:free,pro,enterprise',
            'monto' => 'required|numeric|min:0',
        ]);

        $tenant = Tenant::findOrFail($id);
        $tenant->plan = $request->plan;
        $tenant->suscripcion_monto = $request->monto;
        $tenant->save();

        return response()->json([
            'message'           => 'Plan modificado con éxito.',
            'plan'              => $tenant->plan,
            'suscripcion_monto' => (float)$tenant->suscripcion_monto,
        ]);
    }
}
