<?php

namespace App\Http\Controllers;

use App\Models\Alumno;
use App\Models\Pago;
use App\Models\Asistencia;
use App\Models\Evento;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $tz = 'America/Chihuahua';
        $hoy = Carbon::now($tz);
        $hoySoloFecha = $hoy->toDateString();

        // 1. Alumnos Activos
        $totalAlumnosActivos = Alumno::where('estatus', 'activo')->count();

        // 2. Cálculo de Pagos Pendientes y Al corriente del mes optimizado en 1 sola consulta
        $alumnos = Alumno::where('estatus', 'activo')->get();
        $alumnoIds = $alumnos->pluck('id');

        // Traer pagos relevantes de todos los alumnos en 1 sola consulta agrupada
        $pagosAgrupados = Pago::whereIn('alumno_id', $alumnoIds)
            ->where('fecha_inicio', '>=', $hoy->copy()->subMonths(2)->startOfMonth()->toDateString())
            ->get()
            ->groupBy('alumno_id');
        
        $pagadosCount = 0;
        $pendientesCount = 0;

        foreach ($alumnos as $alumno) {
            $dia = $alumno->dia_pago ?? 1;
            
            // Determinar cuál es el periodo que debería estar pagado hoy
            $inicioEsteMes = Carbon::create($hoy->year, $hoy->month, $dia, 0, 0, 0, $tz);
            
            if ($hoy->lt($inicioEsteMes)) {
                $fechaInicioPeriodo = $inicioEsteMes->copy()->subMonth()->toDateString();
            } else {
                $fechaInicioPeriodo = $inicioEsteMes->toDateString();
            }

            $pagosAlumno = $pagosAgrupados->get($alumno->id, collect());
            $tienePago = $pagosAlumno->contains(function ($p) use ($fechaInicioPeriodo) {
                return $p->fecha_inicio === $fechaInicioPeriodo || str_starts_with($p->fecha_inicio, substr($fechaInicioPeriodo, 0, 7));
            });

            if ($tienePago) {
                $pagadosCount++;
            } else {
                $pendientesCount++;
            }
        }

        // 3. Ingresos del Mes (Suma de montos de pagos realizados en el mes calendario actual)
        $ingresosMes = Pago::whereMonth('fecha_pago', $hoy->month)
            ->whereYear('fecha_pago', $hoy->year)
            ->sum('monto');

        return response()->json([
            'alumnos_activos'    => $totalAlumnosActivos,
            'pagos_al_corriente' => $pagadosCount,
            'pagos_pendientes'   => $pendientesCount,
            'ingresos_mes'       => (float)$ingresosMes,
            
            'asistencias_hoy'    => Asistencia::whereDate('fecha', $hoySoloFecha)
                                            ->where('presente', true)
                                            ->whereHas('alumno', function($query) {
                                                $query->where('estatus', 'activo');
                                            })
                                            ->count(),
                                            
            'eventos_proximos'   => Evento::whereDate('fecha', '>=', $hoySoloFecha)
                                            ->orderBy('fecha')
                                            ->take(5)
                                            ->get(),
        ]);
    }
}