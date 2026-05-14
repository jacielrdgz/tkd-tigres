<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Horario;
use Illuminate\Support\Facades\Cache;

class HorarioController extends Controller
{
    public function index()
    {
        return Horario::all();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'hora_inicio' => 'required',
            'hora_fin' => 'required',
            'dias' => 'nullable|string',
        ]);

        $horario = Horario::create($validated);
        Cache::forget('horarios_lista');
        return response()->json($horario, 201);
    }

    public function update(Request $request, Horario $horario)
    {
        $validated = $request->validate([
            'nombre' => 'sometimes|string|max:255',
            'hora_inicio' => 'sometimes',
            'hora_fin' => 'sometimes',
            'dias' => 'nullable|string',
        ]);

        $horario->update($validated);
        Cache::forget('horarios_lista');
        return response()->json($horario);
    }

    public function destroy(Horario $horario)
    {
        $horario->delete();
        Cache::forget('horarios_lista');
        return response()->json(['message' => 'Horario eliminado correctamente']);
    }
}
