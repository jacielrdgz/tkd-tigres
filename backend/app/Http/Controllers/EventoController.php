<?php

namespace App\Http\Controllers;

use App\Models\Evento;
use Illuminate\Http\Request;

class EventoController extends Controller
{
    public function index(Request $request)
    {
        $query = Evento::orderBy('fecha', 'asc');

        if ($request->has('tipo') && $request->tipo) {
            $query->where('tipo', $request->tipo);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre'      => 'required|string|max:150',
            'tipo'        => 'required|in:examen,torneo,demostracion,seminario',
            'fecha'       => 'required|date',
            'lugar'       => 'nullable|string|max:200',
            'descripcion' => 'nullable|string',
            'costo'       => 'nullable|numeric|min:0',
        ]);

        $evento = Evento::create($validated);

        return response()->json($evento, 201);
    }

    public function show(Evento $evento)
    {
        $evento->load(['modalidades']);
        return response()->json($evento);
    }

    public function update(Request $request, Evento $evento)
    {
        $validated = $request->validate([
            'nombre'      => 'sometimes|string|max:150',
            'tipo'        => 'sometimes|in:examen,torneo,demostracion,seminario',
            'fecha'       => 'sometimes|date',
            'lugar'       => 'nullable|string|max:200',
            'descripcion' => 'nullable|string',
            'costo'       => 'nullable|numeric|min:0',
        ]);

        $evento->update($validated);

        return response()->json($evento);
    }

    public function destroy(Evento $evento)
    {
        $evento->delete();
        return response()->json(['message' => 'Evento eliminado correctamente']);
    }
}