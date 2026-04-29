<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAlumnoRequest;
use App\Http\Requests\UpdateAlumnoRequest;
use App\Models\Alumno;
use App\Models\Asistencia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AlumnoController extends Controller
{
    public function index(Request $request)
    {
        $query = Alumno::with(['cintaConfig', 'ultimoPago', 'horarioConfig']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'like', "%$search%")
                  ->orWhere('apellido_paterno', 'like', "%$search%")
                  ->orWhere('apellido_materno', 'like', "%$search%");
            });
        }

        if ($request->filled('estatus')) {
            $query->where('estatus', $request->estatus);
        }

        if ($request->filled('horario')) {
            $query->where('horario', $request->horario);
        }

        $alumnos = $query->orderBy('nombre')->get();

        foreach ($alumnos as $alumno) {
            $alumno->estatus_pago = $alumno->ultimoPago?->estado ?? 'pendiente';
            
            // Rachas (Cálculo original, posiblemente costoso pero es lo que estaba antes)
            $asistencias = $alumno->asistencias()->orderBy('fecha', 'desc')->take(15)->get();
            
            $contadorFaltas = 0;
            foreach ($asistencias as $asist) {
                if ($asist->presente == 0) $contadorFaltas++;
                else break;
            }
            $alumno->racha_faltas = $contadorFaltas;

            $contadorAsistencias = 0;
            foreach ($asistencias as $asist) {
                if ($asist->presente == 1) $contadorAsistencias++;
                else break;
            }
            $alumno->racha_asistencias = $contadorAsistencias;

            $alumno->ultimas_asistencias = $asistencias->map(function($a) {
                return ['fecha' => $a->fecha, 'presente' => $a->presente];
            });
        }

        return response()->json($alumnos);
    }

    public function store(StoreAlumnoRequest $request)
    {
        $validated = $request->validated();

        if ($request->hasFile('foto')) {
            $validated['foto'] = $request->file('foto')->store('fotos', 'public');
        }

        $alumno = Alumno::create($validated);
        return response()->json($alumno, 201);
    }

    public function show(Alumno $alumno)
    {
        return response()->json($alumno->load(['pagos', 'asistencias', 'cintaConfig']));
    }

    public function update(UpdateAlumnoRequest $request, Alumno $alumno)
    {
        $validated = $request->validated();

        if ($request->has('eliminar_foto') && $request->eliminar_foto == '1') {
            if ($alumno->foto) {
                Storage::disk('public')->delete($alumno->foto);
            }
            $validated['foto'] = null;
        }

        if ($request->hasFile('foto')) {
            if ($alumno->foto) {
                Storage::disk('public')->delete($alumno->foto);
            }
            $validated['foto'] = $request->file('foto')->store('fotos', 'public');
        }

        $alumno->update($validated);
        return response()->json($alumno);
    }

    public function quitarFoto(Alumno $alumno)
    {
        if ($alumno->foto) {
            Storage::disk('public')->delete($alumno->foto);
        }
        $alumno->update(['foto' => null]);

        return response()->json($alumno);
    }

    public function destroy(Alumno $alumno)
    {
        if ($alumno->foto) {
            Storage::disk('public')->delete($alumno->foto);
        }
        $alumno->delete();
        return response()->json(['message' => 'Alumno eliminado correctamente']);
    }

    public function toggleEstatus(Alumno $alumno)
    {
        $alumno->estatus = $alumno->estatus === 'activo' ? 'inactivo' : 'activo';
        $alumno->save();
        return response()->json($alumno);
    }
}