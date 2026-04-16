<?php

namespace App\Http\Controllers;

use App\Models\Evento;
use Illuminate\Http\Request;

class EventoController extends Controller
{
    public function index()
    {
        return response()->json(
            Evento::orderBy('fecha')->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre'      => 'required|string|max:150',
            'tipo'        => 'required|in:examen,torneo,seminario',
            'fecha'       => 'required|date',
            'descripcion' => 'nullable|string',
        ]);

        $evento = Evento::create($validated);

        return response()->json($evento, 201);
    }

    public function show(Evento $evento)
    {
        return response()->json($evento);
    }

    public function update(Request $request, Evento $evento)
    {
        $validated = $request->validate([
            'nombre'      => 'sometimes|string|max:150',
            'tipo'        => 'sometimes|in:examen,torneo,seminario',
            'fecha'       => 'sometimes|date',
            'descripcion' => 'nullable|string',
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