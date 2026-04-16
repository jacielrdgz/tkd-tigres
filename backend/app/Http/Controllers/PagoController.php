<?php

namespace App\Http\Controllers;

use App\Models\Pago;
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

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'alumno_id'   => 'required|exists:alumnos,id',
            'mes'         => 'required|string|max:7',
            'monto'       => 'required|numeric|min:0',
            'metodo_pago' => 'required|in:efectivo,transferencia,tarjeta',
            'estado'      => 'required|in:pagado,pendiente,vencido',
            'fecha_pago'  => 'nullable|date',
        ]);

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
            'mes'         => 'sometimes|string|max:7',
            'monto'       => 'sometimes|numeric|min:0',
            'metodo_pago' => 'sometimes|in:efectivo,transferencia,tarjeta',
            'estado'      => 'sometimes|in:pagado,pendiente,vencido',
            'fecha_pago'  => 'nullable|date',
        ]);

        $pago->update($validated);

        return response()->json($pago->load('alumno'));
    }

    public function destroy(Pago $pago)
    {
        $pago->delete();
        return response()->json(['message' => 'Pago eliminado correctamente']);
    }
}