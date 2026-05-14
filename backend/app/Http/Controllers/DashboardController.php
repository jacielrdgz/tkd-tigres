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

        // 2. Cálculo de Pagos Pendientes y Al corriente del mes
        // Obtenemos todos los pagos de los periodos que podrían estar activos (este mes y el anterior)
        $mesActual = $hoy->format('Y-m');
        $mesPasado = $hoy->copy()->subMonth()->format('Y-m');

        // Obtenemos los alumnos activos con su último pago
        $alumnos = Alumno::where('estatus', 'activo')->get();
        
        $pagadosCount = 0;
        $pendientesCount = 0;

        foreach ($alumnos as $alumno) {
            $dia = $alumno->dia_pago ?? 1;
            
            // Determinar cuál es el periodo que debería estar pagado hoy
            $inicioEsteMes = Carbon::create($hoy->year, $hoy->month, $dia, 0, 0, 0, $tz);
            
            if ($hoy->lt($inicioEsteMes)) {
                // Si aún no llegamos al día de pago de este mes, el periodo a revisar es el que inició el mes pasado
                $fechaInicioPeriodo = $inicioEsteMes->copy()->subMonth()->toDateString();
            } else {
                // Si ya pasamos el día de pago, el periodo a revisar es el de este mes
                $fechaInicioPeriodo = $inicioEsteMes->toDateString();
            }

            $tienePago = Pago::where('alumno_id', $alumno->id)
                ->where('fecha_inicio', $fechaInicioPeriodo)
                ->exists();

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