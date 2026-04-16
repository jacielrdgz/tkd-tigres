<?php

namespace App\Http\Controllers;

use App\Models\Alumno;
use App\Models\Asistencia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class AlumnoController extends Controller
{
    public function index(Request $request)
    {
        $query = Alumno::query();

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
            $ultimoPago = $alumno->pagos()->orderBy('fecha_pago', 'desc')->first();
            $alumno->estatus_pago = $ultimoPago ? $ultimoPago->estado : 'pendiente';

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

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre'           => 'required|string|max:100',
            'apellido_paterno' => 'required|string|max:100',
            'apellido_materno' => 'required|string|max:100',
            'nombre_tutor'     => 'required|string|max:100',
            'telefono_tutor'   => 'required|string|max:20',
            'email'            => 'nullable|email|max:150',
            'fecha_nacimiento' => 'required|date|before:today',
            'foto'             => 'nullable|image|max:2048',
            'cinta'            => 'required|in:blanca,blanca_avanzada,amarilla,amarilla_avanzada,naranja,naranja_avanzada,verde,verde_avanzada,azul,azul_avanzada,marrón,marrón_avanzada,roja,roja_avanzada,negra',
            'estatus'          => 'in:activo,inactivo',
            'horario'          => 'nullable|string|max:50', // <--- CAMBIO: Se agregó horario
        ]);

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

    public function update(Request $request, Alumno $alumno)
    {
        $validated = $request->validate([
            'nombre'           => 'sometimes|string|max:100',
            'apellido_paterno' => 'sometimes|string|max:100',
            'apellido_materno' => 'sometimes|string|max:100',
            'nombre_tutor'     => 'sometimes|string|max:100',
            'telefono_tutor'   => 'sometimes|string|max:20',
            'email'            => 'nullable|email|max:150',
            'fecha_nacimiento' => 'sometimes|date|before:today',
            'foto'             => 'nullable|image|max:2048',
            'cinta'            => 'sometimes|in:blanca,blanca_avanzada,amarilla,amarilla_avanzada,naranja,naranja_avanzada,verde,verde_avanzada,azul,azul_avanzada,marrón,marrón_avanzada,roja,roja_avanzada,negra',
            'estatus'          => 'sometimes|in:activo,inactivo',
            'horario'          => 'sometimes|nullable|string|max:50', // <--- CAMBIO: Se agregó horario
        ]);

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