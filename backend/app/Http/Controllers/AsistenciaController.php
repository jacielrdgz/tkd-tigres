<?php

namespace App\Http\Controllers;

use App\Models\Asistencia;
use App\Models\Alumno;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AsistenciaController extends Controller
{
    // Lista asistencias por fecha
    public function index(Request $request)
    {
        $fecha = $request->get('fecha', Carbon::today()->toDateString());

        $asistencias = Asistencia::with('alumno')
            ->where('fecha', $fecha)
            ->get();

        return response()->json($asistencias);
    }

    // Registrar asistencia del día para todos los alumnos activos
    public function registrarDia(Request $request)
    {
        $request->validate([
            'fecha'        => 'required|date',
            'asistencias'  => 'required|array',
            'asistencias.*.alumno_id' => 'required|exists:alumnos,id',
            'asistencias.*.presente'  => 'required|boolean',
        ]);

        foreach ($request->asistencias as $item) {
            Asistencia::updateOrCreate(
                ['alumno_id' => $item['alumno_id'], 'fecha' => $request->fecha],
                ['presente'  => $item['presente']]
            );
        }

        return response()->json(['message' => 'Asistencias registradas correctamente']);
    }

    // Historial de asistencias de un alumno
    public function porAlumno(Request $request, $alumnoId)
    {
        $asistencias = Asistencia::where('alumno_id', $alumnoId)
            ->orderBy('fecha', 'desc')
            ->get();

        return response()->json($asistencias);
    }
}