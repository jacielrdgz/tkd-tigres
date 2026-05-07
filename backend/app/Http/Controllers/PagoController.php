<?php

namespace App\Http\Controllers;

use App\Models\Alumno;
use App\Models\Pago;
use Carbon\Carbon;
use Illuminate\Http\Request;

class PagoController extends Controller
{
    public function index(Request $request)
    {
        $query = Pago::with('alumno');

        if ($request->filled('alumno_id')) {
            $query->where('alumno_id', $request->alumno_id);
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
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
        $pagos = Pago::where('alumno_id', $alumno->id)
            ->orderBy('fecha_inicio', 'desc')
            ->get();

        return response()->json($pagos);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'alumno_id'   => 'required|exists:alumnos,id',
            'fecha_inicio' => 'required|date',
            'fecha_fin'   => 'required|date|after:fecha_inicio',
            'monto'       => 'required|numeric|min:0',
            'metodo_pago' => 'required|in:efectivo,transferencia,tarjeta',
            'estado'      => 'required|in:pagado,pendiente,vencido',
            'fecha_pago'  => 'nullable|date',
        ]);

        // Calcular el campo `mes` desde fecha_inicio para compatibilidad
        $validated['mes'] = Carbon::parse($validated['fecha_inicio'])->format('Y-m');

        $pago = Pago::create($validated);

        return response()->json($pago->load('alumno'), 201);
    }

    public function show(Pago $pago)
    {
        return response()->json($pago->load('alumno'));
    }

    public function update(Request $request, Pago $pago)
    {
        $validated = $request->validate([
            'fecha_inicio' => 'sometimes|date',
            'fecha_fin'   => 'sometimes|date',
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
        $pago->delete();
        return response()->json(['message' => 'Pago eliminado correctamente']);
    }
}