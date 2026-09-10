<?php

namespace App\Http\Controllers;

use App\Models\Evento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;

class EventoController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Evento::class);

        $request->validate([
            'tipo'    => 'nullable|string|max:50',
            'excluir' => 'nullable|string|max:50',
        ]);

        $query = Evento::orderBy('fecha', 'asc');

        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }

        if ($request->filled('excluir')) {
            $query->where('tipo', '!=', $request->excluir);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        Gate::authorize('create', Evento::class);

        if ($request->has('costo') && ($request->costo === '' || $request->costo === null)) {
            $request->merge(['costo' => null]);
        }

        $validated = $request->validate([
            'nombre'         => 'required|string|max:150',
            'tipo'           => 'required|string|max:50',
            'fecha'          => 'required|date',
            'lugar'          => 'nullable|string|max:200',
            'descripcion'    => 'nullable|string|max:1000',
            'costo'          => 'nullable|numeric|min:0|max:999999.99',
            'precios_cintas' => 'nullable|array',
        ]);

        try {
            $evento = Evento::create($validated);
            return response()->json($evento, 201);
        } catch (\Throwable $e) {
            Log::error('Error creando evento: ' . $e->getMessage(), [
                'exception' => $e,
                'data' => $validated
            ]);
            return response()->json([
                'message' => 'Error al guardar el evento: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show(Evento $evento)
    {
        Gate::authorize('view', $evento);

        $evento->load(['modalidades']);
        return response()->json($evento);
    }

    public function update(Request $request, Evento $evento)
    {
        Gate::authorize('update', $evento);

        if ($request->has('costo') && ($request->costo === '' || $request->costo === null)) {
            $request->merge(['costo' => null]);
        }

        $validated = $request->validate([
            'nombre'         => 'sometimes|string|max:150',
            'tipo'           => 'sometimes|string|max:50',
            'fecha'          => 'sometimes|date',
            'lugar'          => 'nullable|string|max:200',
            'descripcion'    => 'nullable|string|max:1000',
            'costo'          => 'nullable|numeric|min:0|max:999999.99',
            'precios_cintas' => 'nullable|array',
        ]);

        try {
            $evento->update($validated);
            return response()->json($evento);
        } catch (\Throwable $e) {
            Log::error('Error actualizando evento: ' . $e->getMessage(), [
                'exception' => $e,
                'data' => $validated
            ]);
            return response()->json([
                'message' => 'Error al actualizar el evento: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy(Evento $evento)
    {
        Gate::authorize('delete', $evento);

        try {
            DB::transaction(function () use ($evento) {
                // Limpieza explícita y atómica de dependencias relacionadas
                $torneoAlumnoIds = DB::table('torneo_alumno')->where('evento_id', $evento->id)->pluck('id');
                if ($torneoAlumnoIds->isNotEmpty()) {
                    DB::table('torneo_alumno_modalidad')->whereIn('torneo_alumno_id', $torneoAlumnoIds)->delete();
                }
                DB::table('torneo_alumno')->where('evento_id', $evento->id)->delete();
                DB::table('torneo_modalidades')->where('evento_id', $evento->id)->delete();
                DB::table('examen_alumno')->where('evento_id', $evento->id)->delete();
                DB::table('evento_alumno')->where('evento_id', $evento->id)->delete();
                DB::table('historial_grados')->where('evento_id', $evento->id)->update(['evento_id' => null]);

                $evento->delete();
            });

            return response()->json(['message' => 'Evento eliminado correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error eliminando evento: ' . $e->getMessage(), [
                'exception' => $e,
                'evento_id' => $evento->id
            ]);
            return response()->json([
                'message' => 'Error al eliminar el evento: ' . $e->getMessage()
            ], 500);
        }
    }
}