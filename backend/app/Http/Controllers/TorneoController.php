<?php

namespace App\Http\Controllers;

use App\Models\Evento;
use App\Models\TorneoModalidad;
use App\Models\TorneoAlumno;
use Illuminate\Http\Request;

class TorneoController extends Controller
{
    // GET modalidades de un torneo
    public function getModalidades(Evento $evento)
    {
        return response()->json($evento->modalidades);
    }

    // POST crear modalidad
    public function crearModalidad(Request $request, Evento $evento)
    {
        $validated = $request->validate([
            'nombre'    => 'required|string|max:100',
            'categoria' => 'nullable|string|max:100',
        ]);

        $modalidad = TorneoModalidad::create([
            'evento_id' => $evento->id,
            'nombre'    => $validated['nombre'],
            'categoria' => $validated['categoria'] ?? null,
        ]);

        return response()->json($modalidad, 201);
    }

    // DELETE eliminar modalidad
    public function eliminarModalidad(Evento $evento, TorneoModalidad $modalidad)
    {
        $modalidad->delete();
        return response()->json(['message' => 'Modalidad eliminada']);
    }

    // PUT actualizar resultado de alumno en modalidad específica
    public function actualizarResultadoModalidad(Request $request, Evento $evento, $torneoAlumnoId, TorneoModalidad $modalidad)
    {
        $validated = $request->validate([
            'resultado' => 'required|in:oro,plata,bronce,eliminado,pendiente',
        ]);

        $ta = TorneoAlumno::findOrFail($torneoAlumnoId);

        $ta->modalidades()->updateExistingPivot($modalidad->id, [
            'resultado' => $validated['resultado'],
        ]);

        return response()->json(['message' => 'Resultado actualizado']);
    }

    // PUT inscribir en modalidad adicional
    public function inscribirModalidad(Request $request, $torneoAlumnoId)
    {
        $validated = $request->validate([
            'modalidad_id' => 'required|exists:torneo_modalidades,id',
        ]);

        $ta = TorneoAlumno::findOrFail($torneoAlumnoId);
        $ta->modalidades()->syncWithoutDetaching([$validated['modalidad_id']]);

        return response()->json(['message' => 'Modalidad agregada']);
    }
}
