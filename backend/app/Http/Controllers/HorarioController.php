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
            'nombre'      => ['required', 'string', 'max:100'],
            'hora_inicio' => ['required', 'string', 'regex:/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/'],
            'hora_fin'    => ['required', 'string', 'regex:/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/'],
            'dias'        => ['nullable', 'string', 'max:100'],
        ]);

        $horario = Horario::create($validated);
        Cache::forget('horarios_lista');
        return response()->json($horario, 201);
    }

    public function update(Request $request, Horario $horario)
    {
        $validated = $request->validate([
            'nombre'      => ['sometimes', 'string', 'max:100'],
            'hora_inicio' => ['sometimes', 'string', 'regex:/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/'],
            'hora_fin'    => ['sometimes', 'string', 'regex:/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/'],
            'dias'        => ['nullable', 'string', 'max:100'],
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
