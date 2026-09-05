<?php

namespace App\Http\Controllers;

use App\Models\Alumno;
use App\Models\Pago;
use Carbon\Carbon;
use Illuminate\Http\Request;

use Illuminate\Support\Facades\Gate;

class PagoController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Pago::class);

        $query = Pago::with('alumno');

        if ($request->filled('alumno_id')) {
            $query->where('alumno_id', $request->alumno_id);
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        // Filtrar por tipo (mensualidad, inscripcion)
        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }

        // Filtrar por período activo (fecha_inicio)
        if ($request->filled('fecha_inicio')) {
            $query->where('fecha_inicio', $request->fecha_inicio);
        }

        return response()->json($query->orderBy('fecha_inicio', 'desc')->get());
    }

    /**
     * Devuelve todos los pagos de un alumno específico, para el historial.
     */
    public function porAlumno(Alumno $alumno)
    {
        Gate::authorize('viewAny', Pago::class);

        $pagos = Pago::where('alumno_id', $alumno->id)
            ->orderBy('fecha_inicio', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($pagos);
    }

    public function store(Request $request)
    {
        Gate::authorize('create', Pago::class);

        $validated = $request->validate([
            'alumno_id'   => 'required|exists:alumnos,id',
            'tipo'        => 'nullable|in:mensualidad,inscripcion',
            'fecha_inicio' => 'nullable|required_if:tipo,mensualidad|date',
            'fecha_fin'   => 'nullable|required_if:tipo,mensualidad|date|after:fecha_inicio',
            'monto'       => 'required|numeric|min:0',
            'metodo_pago' => 'required|in:efectivo,transferencia,tarjeta',
            'estado'      => 'required|in:pagado,pendiente,vencido',
            'fecha_pago'  => 'nullable|date',
        ]);

        $validated['tipo'] = $validated['tipo'] ?? 'mensualidad';

        // Calcular el campo `mes` desde fecha_inicio para compatibilidad si es mensualidad
        if ($validated['tipo'] === 'mensualidad' && isset($validated['fecha_inicio'])) {
            $validated['mes'] = Carbon::parse($validated['fecha_inicio'])->format('Y-m');
        }

        // Asignar el tenant_id con fallback seguro
        $tenantId = auth()->user()?->tenant_id;
        if (!$tenantId) {
            $alumnoRecord = Alumno::find($validated['alumno_id']);
            $tenantId = $alumnoRecord?->tenant_id ?? 1;
        }
        $validated['tenant_id'] = $tenantId;

        try {
            $pago = Pago::create($validated);
            return response()->json($pago->load('alumno'), 201);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Error creando pago: ' . $e->getMessage(), [
                'exception' => $e,
                'data' => $validated
            ]);
            return response()->json([
                'message' => 'Error al registrar el pago: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show(Pago $pago)
    {
        Gate::authorize('view', $pago);
        return response()->json($pago->load('alumno'));
    }

    public function update(Request $request, Pago $pago)
    {
        Gate::authorize('update', $pago);

        $validated = $request->validate([
            'tipo'         => 'sometimes|in:mensualidad,inscripcion',
            'fecha_inicio' => 'sometimes|nullable|date',
            'fecha_fin'   => 'sometimes|nullable|date',
            'monto'       => 'sometimes|numeric|min:0',
            'metodo_pago' => 'sometimes|in:efectivo,transferencia,tarjeta',
            'estado'      => 'sometimes|in:pagado,pendiente,vencido',
            'fecha_pago'  => 'nullable|date',
        ]);

        if (isset($validated['fecha_inicio'])) {
            $validated['mes'] = Carbon::parse($validated['fecha_inicio'])->format('Y-m');
        }

        $pago->update($validated);

        return response()->json($pago->load('alumno'));
    }

    public function destroy(Pago $pago)
    {
        Gate::authorize('delete', $pago);
        $pago->delete();
        return response()->json(['message' => 'Pago eliminado correctamente']);
    }
}