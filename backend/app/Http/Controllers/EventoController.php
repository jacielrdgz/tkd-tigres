<?php

namespace App\Http\Controllers;

use App\Models\Evento;
use Illuminate\Http\Request;

use Illuminate\Support\Facades\Gate;

class EventoController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Evento::class);

        $query = Evento::orderBy('fecha', 'asc');

        if ($request->has('tipo') && $request->tipo) {
            $query->where('tipo', $request->tipo);
        }

        if ($request->has('excluir') && $request->excluir) {
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
            'nombre'      => 'required|string|max:150',
            'tipo'        => 'required|in:examen,torneo,demostracion,seminario',
            'fecha'       => 'required|date',
            'lugar'       => 'nullable|string|max:200',
            'descripcion' => 'nullable|string',
            'costo'       => 'nullable|numeric|min:0',
            'precios_cintas' => 'nullable|array',
        ]);

        if (!\Illuminate\Support\Facades\Schema::hasColumn('eventos', 'precios_cintas')) {
            unset($validated['precios_cintas']);
        }

        $evento = Evento::create($validated);

        return response()->json($evento, 201);
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
            'nombre'      => 'sometimes|string|max:150',
            'tipo'        => 'sometimes|in:examen,torneo,demostracion,seminario',
            'fecha'       => 'sometimes|date',
            'lugar'       => 'nullable|string|max:200',
            'descripcion' => 'nullable|string',
            'costo'       => 'nullable|numeric|min:0',
            'precios_cintas' => 'nullable|array',
        ]);

        if (!\Illuminate\Support\Facades\Schema::hasColumn('eventos', 'precios_cintas')) {
            unset($validated['precios_cintas']);
        }

        $evento->update($validated);

        return response()->json($evento);
    }

    public function destroy(Evento $evento)
    {
        Gate::authorize('delete', $evento);

        $evento->delete();
        return response()->json(['message' => 'Evento eliminado correctamente']);
    }
}