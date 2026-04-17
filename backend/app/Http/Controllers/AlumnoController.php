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
        $query = Alumno::query()->with('ultimoPago');

        // Filtros de búsqueda existentes
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

        // --- NUEVO: Filtro por Horario ---
        if ($request->filled('horario')) {
            $query->where('horario', $request->horario);
        }

        // Obtenemos los alumnos
        $alumnos = $query->orderBy('nombre')->get();

        // Mapeamos los datos extra para el semáforo y la racha
        $alumnos->map(function ($alumno) {
            
            // 1. LÓGICA DEL SEMÁFORO (Último pago)
            $alumno->estatus_pago = $alumno->ultimoPago?->estado ?? 'pendiente';

            // 2. LÓGICA DE RACHA DE FALTAS (Últimas 5 asistencias)
            $ultimasAsistencias = Asistencia::where('alumno_id', $alumno->id)
                ->orderBy('fecha', 'desc')
                ->take(5)
                ->get();

            $contadorFaltas = 0;
            foreach ($ultimasAsistencias as $asist) {
                if ($asist->presente == 0) {
                    $contadorFaltas++;
                } else {
                    break;
                }
            }
            
            $alumno->racha_faltas = $contadorFaltas;

            return $alumno;
        });

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
        return response()->json($alumno->load(['pagos', 'asistencias']));
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