<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tenant;
use App\Models\SuscripcionHistorial;
use Carbon\Carbon;

class AdminSuscripcionController extends Controller
{
    /**
     * Listado de suscripciones con filtros.
     */
    public function index(Request $request)
    {
        $query = Tenant::query();

        if ($request->filled('estado')) {
            $query->where('suscripcion_estado', $request->estado);
        }

        if ($request->filled('mes_vencimiento')) {
            $query->whereMonth('suscripcion_hasta', $request->mes_vencimiento);
        }

        $suscripciones = $query->get()->map(function ($tenant) {
            $diasRestantes = 0;
            if ($tenant->suscripcion_hasta) {
                $venc = Carbon::parse($tenant->suscripcion_hasta);
                $diasRestantes = Carbon::now()->startOfDay()->diffInDays($venc, false);
            }

            return [
                'id'                 => $tenant->id,
                'nombre'             => $tenant->nombre,
                'plan'               => $tenant->plan,
                'suscripcion_estado' => $tenant->suscripcion_estado,
                'suscripcion_hasta'  => $tenant->suscripcion_hasta ? $tenant->suscripcion_hasta->toDateString() : null,
                'suscripcion_monto'  => (float)$tenant->suscripcion_monto,
                'is_suspended'       => $tenant->is_suspended,
                'dias_restantes'     => $diasRestantes,
            ];
        });

        return response()->json($suscripciones);
    }

    /**
     * Renovar manualmente una suscripción.
     */
    public function renovar(Request $request, $id)
    {
        $request->validate([
            'monto' => 'required|numeric|min:0',
            'meses' => 'required|integer|min:1|max:12',
        ]);

        $tenant = Tenant::findOrFail($id);

        // Calcular nueva fecha de vencimiento
        $baseFecha = Carbon::now();
        
        // Si la suscripción aún está activa y vence en el futuro, renovamos desde la fecha de vencimiento actual
        if ($tenant->suscripcion_hasta && Carbon::parse($tenant->suscripcion_hasta)->isFuture()) {
            $baseFecha = Carbon::parse($tenant->suscripcion_hasta);
        }

        $nuevaFecha = $baseFecha->addMonths($request->meses)->toDateString();

        // Actualizar el tenant
        $tenant->suscripcion_estado = 'activa';
        $tenant->suscripcion_hasta = $nuevaFecha;
        $tenant->suscripcion_monto = $request->monto;
        $tenant->is_suspended = false; // Asegurar que no quede suspendido
        $tenant->save();

        // Registrar en el historial de suscripciones
        SuscripcionHistorial::create([
            'tenant_id'    => $tenant->id,
            'plan'         => $tenant->plan,
            'monto'        => $request->monto,
            'fecha_pago'   => Carbon::now()->toDateString(),
            'valido_hasta' => $nuevaFecha,
        ]);

        return response()->json([
            'message'            => 'Suscripción renovada exitosamente.',
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
