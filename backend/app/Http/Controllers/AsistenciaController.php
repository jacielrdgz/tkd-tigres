<?php

namespace App\Http\Controllers;

use App\Models\Asistencia;
use App\Models\Alumno;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AsistenciaController extends Controller
{
    // -------------------------------------------------------------------------
    // GET /api/asistencias/resumen?mes=2026-05
    // { total_alumnos, pct_promedio, baja_asistencia }
    // -------------------------------------------------------------------------
    public function resumen(Request $request)
    {
        $mes = $request->get('mes', Carbon::now()->format('Y-m'));

        $alumnos = Alumno::where('estatus', 'activo')->pluck('id');
        $totalAlumnos = $alumnos->count();

        if ($totalAlumnos === 0) {
            return response()->json([
                'total_alumnos'   => 0,
                'pct_promedio'    => 0,
                'baja_asistencia' => 0,
            ]);
        }

        $carbonMes = Carbon::parse($mes . '-01');
        $inicioMes = $carbonMes->copy()->startOfMonth()->toDateString();
        $finMes    = $carbonMes->copy()->endOfMonth()->toDateString();

        // Fechas con clase en el mes de los alumnos activos
        $asistenciasMes = Asistencia::whereIn('alumno_id', $alumnos)
            ->whereBetween('fecha', [$inicioMes, $finMes])
            ->select('id', 'alumno_id', 'presente')
            ->get();

        if ($asistenciasMes->isEmpty()) {
            return response()->json([
                'total_alumnos'   => $totalAlumnos,
                'pct_promedio'    => 0,
                'baja_asistencia' => 0,
            ]);
        }

        $agrupadas = $asistenciasMes->groupBy('alumno_id');

        $sumPct = 0;
        $bajaAsistencia = 0;

        foreach ($alumnos as $alumnoId) {
            $regs = $agrupadas->get($alumnoId, collect());
            $total = $regs->count();
            $asistio = $regs->filter(fn($r) => (bool)$r->presente)->count();
            $pct = $total > 0 ? round(($asistio / $total) * 100) : 0;

            $sumPct += $pct;
            if ($pct < 60) {
                $bajaAsistencia++;
            }
        }

        return response()->json([
            'total_alumnos'   => $totalAlumnos,
            'pct_promedio'    => $totalAlumnos > 0 ? round($sumPct / $totalAlumnos) : 0,
            'baja_asistencia' => $bajaAsistencia,
        ]);
    }

    // -------------------------------------------------------------------------
    // GET /api/asistencias/por-alumno?mes=2026-05
    // [{ alumno_id, nombre, apellido_paterno, apellido_materno, horario, grado,
    //    asistio, falto, total, pct, foto_url, cinta_config, horario_config }]
    // -------------------------------------------------------------------------
    public function porAlumno(Request $request)
    {
        $mes = $request->get('mes', Carbon::now()->format('Y-m'));

        $alumnos = Alumno::where('estatus', 'activo')
            ->with(['cintaConfig', 'horarioConfig'])
            ->get();

        $alumnoIds = $alumnos->pluck('id');

        $asistenciasMes = Asistencia::whereIn('alumno_id', $alumnoIds)
            ->where('fecha', 'like', $mes . '%')
            ->select('id', 'alumno_id', 'fecha', 'presente')
            ->get();

        $fechaLimite = Carbon::now()->subDays(60)->toDateString();
        $asistenciasRecientes = Asistencia::whereIn('alumno_id', $alumnoIds)
            ->where('fecha', '>=', $fechaLimite)
            ->select('id', 'alumno_id', 'fecha', 'presente')
            ->orderBy('fecha', 'desc')
            ->get()
            ->groupBy('alumno_id');

        $resultado = $alumnos->map(function ($alumno) use ($asistenciasMes, $asistenciasRecientes) {
            $registros = $asistenciasMes->where('alumno_id', $alumno->id);
            $total     = $registros->count();
            $asistio   = $registros->where('presente', true)->count();
            $falto     = $total - $asistio;
            $pct       = $total > 0 ? round(($asistio / $total) * 100) : 0;

            $recientes = $asistenciasRecientes->get($alumno->id, collect());
            $rachaFaltas = 0;
            foreach ($recientes as $asist) {
                if ($asist->presente == 0) $rachaFaltas++;
                else break;
            }

            return [
                'alumno_id'      => $alumno->id,
                'nombre'         => $alumno->nombre,
                'apellido_paterno' => $alumno->apellido_paterno,
                'apellido_materno' => $alumno->apellido_materno,
                'foto_url'       => $alumno->foto_url,
                'telefono_tutor' => $alumno->telefono_tutor,
                'cinta_config'   => $alumno->cintaConfig,
                'horario_config' => $alumno->horarioConfig,
                'fecha_nacimiento' => $alumno->fecha_nacimiento,
                'asistio'        => $asistio,
                'falto'          => $falto,
                'total'          => $total,
                'pct'            => $pct,
                'racha_faltas'   => $rachaFaltas,
            ];
        });

        return response()->json($resultado->values());
    }

    // -------------------------------------------------------------------------
    // GET /api/asistencias/alumno/{id}?mes=2026-05
    // { alumno: {...}, dias: { "2026-05-04": "asistio"|"falto"|"sin_clase" } }
    // -------------------------------------------------------------------------
    public function alumno(Request $request, $alumnoId)
    {
        $mes = $request->get('mes', Carbon::now()->format('Y-m'));

        $alumno = Alumno::with(['cintaConfig', 'horarioConfig'])->findOrFail($alumnoId);

        [$anio, $mesNum] = explode('-', $mes);
        $diasEnMes = cal_days_in_month(CAL_GREGORIAN, (int)$mesNum, (int)$anio);

        // Días de la semana que tiene el alumno según su horario
        $diasConClaseSet = $this->obtenerDiasConClase($alumno->horarioConfig);

        // Registros de asistencia del alumno en el mes
        $registros = Asistencia::where('alumno_id', $alumnoId)
            ->where('fecha', 'like', $mes . '%')
            ->get()
            ->keyBy('fecha');

        $dias = [];
        for ($d = 1; $d <= $diasEnMes; $d++) {
            $fechaStr = $mes . '-' . str_pad($d, 2, '0', STR_PAD_LEFT);
            $diaSemana = Carbon::parse($fechaStr)->dayOfWeek; // 0=Dom, 6=Sab

            $esFinDeSemana = in_array($diaSemana, [0, 6]);

            if (isset($registros[$fechaStr])) {
                $dias[$fechaStr] = $registros[$fechaStr]->presente ? 'asistio' : 'falto';
            } elseif ($esFinDeSemana) {
                $dias[$fechaStr] = 'sin_clase';
            } elseif ($diasConClaseSet !== null && !in_array($diaSemana, $diasConClaseSet)) {
                $dias[$fechaStr] = 'sin_clase';
            } else {
                // Si hay horario definido y ese día tiene clase, pero no hay registro
                // A petición del usuario: si no se registró falta, no se cuenta como falta
                $dias[$fechaStr] = 'sin_clase';
            }
        }

        // Calcular stats del mes para la respuesta basados exactamente en lo que muestra el calendario
        $totalClases = 0;
        $asistio     = 0;
        $falto       = 0;
        
        foreach ($dias as $estado) {
            if ($estado === 'asistio') {
                $asistio++;
                $totalClases++;
            } elseif ($estado === 'falto') {
                $falto++;
                $totalClases++;
            }
        }
        
        $pct = $totalClases > 0 ? round(($asistio / $totalClases) * 100) : 0;

        return response()->json([
            'alumno' => [
                'id'               => $alumno->id,
                'nombre'           => $alumno->nombre,
                'apellido_paterno' => $alumno->apellido_paterno,
                'apellido_materno' => $alumno->apellido_materno,
                'foto_url'         => $alumno->foto_url,
                'cinta_config'     => $alumno->cintaConfig,
                'horario_config'   => $alumno->horarioConfig,
            ],
            'stats' => [
                'total'  => $totalClases,
                'asistio' => $asistio,
                'falto'  => $falto,
                'pct'    => $pct,
            ],
            'dias' => $dias,
        ]);
    }

    // -------------------------------------------------------------------------
    // GET /api/asistencias/por-fecha?mes=2026-05
    // { "2026-05-04": { asistieron: 26, total: 30, pct: 86 } }
    // -------------------------------------------------------------------------
    public function porFecha(Request $request)
    {
        $mes = $request->get('mes', Carbon::now()->format('Y-m'));

        $alumnos = Alumno::where('estatus', 'activo')->pluck('id');
        if ($alumnos->isEmpty()) {
            return response()->json([]);
        }

        $carbonMes = Carbon::parse($mes . '-01');
        $inicioMes = $carbonMes->copy()->startOfMonth()->toDateString();
        $finMes    = $carbonMes->copy()->endOfMonth()->toDateString();

        $registros = Asistencia::whereIn('alumno_id', $alumnos)
            ->whereBetween('fecha', [$inicioMes, $finMes])
            ->select('id', 'fecha', 'presente')
            ->get();

        $agrupadas = $registros->groupBy('fecha');

        $porFecha = [];
        foreach ($agrupadas as $fecha => $asists) {
            $total = $asists->count();
            $asistieron = $asists->filter(fn($r) => (bool)$r->presente)->count();
            $porFecha[$fecha] = [
                'asistieron' => $asistieron,
                'total'      => $total,
                'pct'        => $total > 0 ? (int) round(($asistieron / $total) * 100) : 0,
            ];
        }

        return response()->json($porFecha);
    }

    // -------------------------------------------------------------------------
    // GET /api/asistencias/dia/{fecha}
    // { fecha, stats: {...}, alumnos: [{ id, nombre, grado, asistio }] }
    // -------------------------------------------------------------------------
    public function dia(Request $request, string $fecha)
    {
        $registros = Asistencia::where('fecha', $fecha)
            ->with(['alumno.cintaConfig'])
            ->get();

        $alumnos = $registros->map(function ($registro) {
            $alumno = $registro->alumno;
            if (!$alumno) return null;

            return [
                'id'               => $alumno->id,
                'nombre'           => $alumno->nombre,
                'apellido_paterno' => $alumno->apellido_paterno,
                'apellido_materno' => $alumno->apellido_materno,
                'foto_url'         => $alumno->foto_url,
                'cinta_config'     => $alumno->cintaConfig,
                'asistio'          => (bool) $registro->presente,
            ];
        })->filter()->values();

        $total     = $alumnos->count();
        $asistieron = $alumnos->where('asistio', true)->count();
        $faltaron  = $total - $asistieron;
        $pct       = $total > 0 ? round(($asistieron / $total) * 100) : 0;

        return response()->json([
            'fecha'   => $fecha,
            'stats'   => [
                'total'      => $total,
                'asistieron' => $asistieron,
                'faltaron'   => $faltaron,
                'pct'        => $pct,
            ],
            'alumnos' => $alumnos,
        ]);
    }

    // -------------------------------------------------------------------------
    // GET /api/asistencias?fecha=2026-05-22  (CONSERVADO — pase de lista diario)
    // -------------------------------------------------------------------------
    public function index(Request $request)
    {
        $fecha = $request->get('fecha', Carbon::today()->toDateString());

        $alumnos = Alumno::where('estatus', 'activo')
            ->with(['cintaConfig', 'horarioConfig'])
            ->get();

        $asistencias = Asistencia::where('fecha', $fecha)->get()->keyBy('alumno_id');

        $resultado = $alumnos->map(function ($alumno) use ($asistencias, $fecha) {
            $registro = $asistencias->get($alumno->id);
            return [
                'alumno_id'      => $alumno->id,
                'nombre'         => $alumno->nombre,
                'apellido_paterno' => $alumno->apellido_paterno,
                'apellido_materno' => $alumno->apellido_materno,
                'foto_url'       => $alumno->foto_url,
                'estatus'        => $alumno->estatus,
                'cinta_config'   => $alumno->cintaConfig,
                'horario_config' => $alumno->horarioConfig,
                'presente'       => $registro ? (bool) $registro->presente : false,
                'registrado'     => $registro !== null,
            ];
        });

        return response()->json($resultado->values());
    }

    // -------------------------------------------------------------------------
    // POST /api/asistencias/registrar-dia  (CONSERVADO)
    // -------------------------------------------------------------------------
    public function registrarDia(Request $request)
    {
        $request->validate([
            'fecha'                       => 'required|date',
            'asistencias'                 => 'required|array',
            'asistencias.*.alumno_id'     => 'required|exists:alumnos,id',
            'asistencias.*.presente'      => 'required|boolean',
        ]);

        $fechaCarbon = Carbon::parse($request->fecha);
        $diaSemana = $fechaCarbon->dayOfWeek; // 0=Dom, 1=Lun, ..., 6=Sab
        $tenantId = auth()->user()->tenant_id;
        $ahora = now();

        // Obtener todos los alumnos involucrados con su horarioConfig cargado en 1 sola consulta
        $alumnoIds = collect($request->asistencias)->pluck('alumno_id')->toArray();
        $alumnos = Alumno::with('horarioConfig')->whereIn('id', $alumnoIds)->get()->keyBy('id');

        $recordsToUpsert = [];
        $recordsToDelete = [];

        foreach ($request->asistencias as $item) {
            $alumnoId = $item['alumno_id'];
            $presente = (bool) $item['presente'];

            if ($presente) {
                // Solo registramos a quienes asistieron realmente
                $recordsToUpsert[] = [
                    'alumno_id'  => $alumnoId,
                    'fecha'      => $request->fecha,
                    'presente'   => true,
                    'tenant_id'  => $tenantId,
                    'created_at' => $ahora,
                    'updated_at' => $ahora,
                ];
            } else {
                // Alumno desmarcado: se borra si existía para esa fecha (cero registros de falta)
                $recordsToDelete[] = $alumnoId;
            }
        }

        // Ejecutar upsert y delete masivos en 1 sola transacción ultrarrápida
        \Illuminate\Support\Facades\DB::transaction(function () use ($recordsToUpsert, $recordsToDelete, $request) {
            if (!empty($recordsToUpsert)) {
                Asistencia::upsert(
                    $recordsToUpsert,
                    ['alumno_id', 'fecha'],
                    ['presente', 'updated_at']
                );
            }

            if (!empty($recordsToDelete)) {
                Asistencia::whereIn('alumno_id', $recordsToDelete)
                    ->where('fecha', $request->fecha)
                    ->delete();
            }
        });

        return response()->json(['message' => 'Asistencias registradas correctamente']);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Convierte el string de días del horario ("Lunes, Miércoles, Viernes")
     * en un array de números de día de la semana Carbon (1=Lun, 7=Dom).
     * Retorna null si el horario no tiene días definidos (todos los días cuentan).
     */
    private function obtenerDiasConClase($horarioConfig): ?array
    {
        if (!$horarioConfig || !$horarioConfig->dias) {
            return null; // Sin restricción de días
        }

        $mapa = [
            'lunes'     => 1,
            'martes'    => 2,
            'miercoles' => 3,
            'miércoles' => 3,
            'jueves'    => 4,
            'viernes'   => 5,
            'sabado'    => 6,
            'sábado'    => 6,
            'domingo'   => 0,
        ];

        $dias = array_map(
            fn($d) => strtolower(trim($d)),
            explode(',', $horarioConfig->dias)
        );

        $numeros = [];
        foreach ($dias as $dia) {
            $diaNorm = $this->normalizarTexto($dia);
            if (isset($mapa[$diaNorm])) {
                $numeros[] = $mapa[$diaNorm];
            }
        }

        return count($numeros) > 0 ? $numeros : null;
    }

    private function normalizarTexto(string $texto): string
    {
        return strtr(strtolower($texto), [
            'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u',
            'ü' => 'u', 'ñ' => 'n',
        ]);
    }

    /**
     * Devuelve el historial plano completo de asistencias de un alumno (para compatibilidad con el módulo antiguo).
     */
    public function alumnoHistorialLegacy(Request $request, $alumnoId)
    {
        $asistencias = Asistencia::where('alumno_id', $alumnoId)
            ->orderBy('fecha', 'desc')
            ->get();

        return response()->json($asistencias);
    }
}