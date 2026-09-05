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

        $alumnos = Alumno::where('estatus', 'activo')
            ->with(['horarioConfig'])
            ->get();
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

        $asistenciasMes = Asistencia::whereIn('alumno_id', $alumnos->pluck('id'))
            ->whereBetween('fecha', [$inicioMes, $finMes])
            ->where('presente', true)
            ->select('id', 'alumno_id', 'fecha', 'presente')
            ->get()
            ->groupBy('alumno_id');

        [$anio, $mesNum] = explode('-', $mes);

        $sumPct = 0;
        $bajaAsistencia = 0;
        $alumnosEvaluados = 0;

        foreach ($alumnos as $alumno) {
            $regs = $asistenciasMes->get($alumno->id, collect());
            $asistio = $regs->count();

            $fechasEsperadas = $this->obtenerFechasClaseAlumno($alumno, (int)$anio, (int)$mesNum);
            $todasFechas = array_unique(array_merge($fechasEsperadas, $regs->pluck('fecha')->toArray()));
            $total = count($todasFechas);

            if ($total > 0) {
                $pct = (int) round(($asistio / $total) * 100);
                $sumPct += $pct;
                $alumnosEvaluados++;
                if ($pct < 60) {
                    $bajaAsistencia++;
                }
            }
        }

        return response()->json([
            'total_alumnos'   => $totalAlumnos,
            'pct_promedio'    => $alumnosEvaluados > 0 ? (int) round($sumPct / $alumnosEvaluados) : 0,
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

        $fechaLimiteReciente = Carbon::now()->subDays(60)->toDateString();
        $asistenciasRecientes = Asistencia::whereIn('alumno_id', $alumnoIds)
            ->where('fecha', '>=', $fechaLimiteReciente)
            ->where('presente', true)
            ->select('id', 'alumno_id', 'fecha')
            ->get()
            ->groupBy('alumno_id');

        [$anio, $mesNum] = explode('-', $mes);

        $resultado = $alumnos->map(function ($alumno) use ($asistenciasMes, $asistenciasRecientes, $anio, $mesNum) {
            $registros = $asistenciasMes->where('alumno_id', $alumno->id);
            $fechasAsistidas = $registros->where('presente', true)->pluck('fecha')->toArray();
            $asistio = count($fechasAsistidas);

            // Calcular fechas que debía asistir según horario
            $fechasEsperadas = $this->obtenerFechasClaseAlumno($alumno, (int)$anio, (int)$mesNum);

            // Total de días de clase esperados o asistidos
            $todasFechasClase = array_unique(array_merge($fechasEsperadas, $fechasAsistidas));
            $total = count($todasFechasClase);

            $falto = max(0, $total - $asistio);
            $pct = $total > 0 ? (int) round(($asistio / $total) * 100) : 0;

            // Racha de faltas al vuelo basada en fechas recientes esperadas
            $rachaFaltas = 0;
            $fechasRecientesEsperadas = $this->obtenerFechasClaseAlumno($alumno, (int)now()->year, (int)now()->month);
            rsort($fechasRecientesEsperadas); // De más reciente a más antigua

            $asistidasRecientesSet = $asistenciasRecientes->get($alumno->id, collect())->pluck('fecha')->flip();

            foreach ($fechasRecientesEsperadas as $f) {
                if (!$asistidasRecientesSet->has($f)) {
                    $rachaFaltas++;
                } else {
                    break;
                }
            }

            return [
                'alumno_id'        => $alumno->id,
                'nombre'           => $alumno->nombre,
                'apellido_paterno' => $alumno->apellido_paterno,
                'apellido_materno' => $alumno->apellido_materno,
                'foto_url'         => $alumno->foto_url,
                'telefono_tutor'   => $alumno->telefono_tutor,
                'cinta_config'     => $alumno->cintaConfig,
                'horario_config'   => $alumno->horarioConfig,
                'fecha_nacimiento' => $alumno->fecha_nacimiento,
                'asistio'          => $asistio,
                'falto'            => $falto,
                'total'            => $total,
                'pct'              => $pct,
                'racha_faltas'     => $rachaFaltas,
            ];
        });

        return response()->json($resultado->values());
    }

    // -------------------------------------------------------------------------
    // GET /api/asistencias/alumno/{id}?mes=2026-05
    // { alumno: {...}, stats: {...}, dias: { "2026-05-04": "asistio"|"falto"|"sin_clase" } }
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

        $hoyStr = Carbon::today()->toDateString();
        $horaFin = $alumno->horarioConfig && $alumno->horarioConfig->hora_fin
            ? $alumno->horarioConfig->hora_fin
            : '20:00:00';
        $claseHoyPaso = Carbon::now()->format('H:i:s') >= $horaFin;
        $fechaIngreso = $alumno->fecha_ingreso ? Carbon::parse($alumno->fecha_ingreso)->toDateString() : null;

        $dias = [];
        $asistioCount = 0;
        $faltoCount = 0;

        for ($d = 1; $d <= $diasEnMes; $d++) {
            $fechaStr = sprintf('%s-%02d', $mes, $d);
            $diaSemana = Carbon::parse($fechaStr)->dayOfWeek; // 0=Dom, 6=Sab
            $esFinDeSemana = in_array($diaSemana, [0, 6]);

            // Determinar si le tocaba clase según horario
            $tieneClase = false;
            if ($diasConClaseSet !== null) {
                $tieneClase = in_array($diaSemana, $diasConClaseSet);
            } else {
                $tieneClase = !$esFinDeSemana;
            }

            // Si es antes de su fecha de ingreso a la escuela
            if ($fechaIngreso && $fechaStr < $fechaIngreso) {
                $dias[$fechaStr] = 'sin_clase';
                continue;
            }

            // Si hay registro guardado en BD:
            if (isset($registros[$fechaStr])) {
                if ((bool)$registros[$fechaStr]->presente) {
                    $dias[$fechaStr] = 'asistio';
                    $asistioCount++;
                } else {
                    $dias[$fechaStr] = 'falto';
                    $faltoCount++;
                }
                continue;
            }

            // Si no hay registro en BD: cálculo al vuelo
            if ($fechaStr > $hoyStr) {
                // Fecha futura: aún no ocurre la clase
                $dias[$fechaStr] = 'sin_clase';
            } elseif (!$tieneClase) {
                // No le correspondía clase ese día
                $dias[$fechaStr] = 'sin_clase';
            } elseif ($fechaStr === $hoyStr && !$claseHoyPaso) {
                // Hoy le corresponde clase pero aún no ha concluido el horario
                $dias[$fechaStr] = 'sin_clase';
            } else {
                // Fecha pasada (o clase de hoy concluida) donde le tocaba clase y no asistió: FALTA
                $dias[$fechaStr] = 'falto';
                $faltoCount++;
            }
        }

        $totalClases = $asistioCount + $faltoCount;
        $pct = $totalClases > 0 ? (int) round(($asistioCount / $totalClases) * 100) : 0;

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
                'total'   => $totalClases,
                'asistio' => $asistioCount,
                'falto'   => $faltoCount,
                'pct'     => $pct,
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

        $alumnos = Alumno::where('estatus', 'activo')
            ->with('horarioConfig')
            ->get();

        if ($alumnos->isEmpty()) {
            return response()->json([]);
        }

        $carbonMes = Carbon::parse($mes . '-01');
        $inicioMes = $carbonMes->copy()->startOfMonth()->toDateString();
        $finMes    = $carbonMes->copy()->endOfMonth()->toDateString();

        $registros = Asistencia::whereIn('alumno_id', $alumnos->pluck('id'))
            ->whereBetween('fecha', [$inicioMes, $finMes])
            ->select('id', 'alumno_id', 'fecha', 'presente')
            ->get();

        $agrupadas = $registros->groupBy('fecha');

        $porFecha = [];
        foreach ($agrupadas as $fecha => $asists) {
            $asistieron = $asists->filter(fn($r) => (bool)$r->presente)->count();

            // Calcular cuántos alumnos debían tener clase ese día
            $diaSemana = Carbon::parse($fecha)->dayOfWeek;
            $esFinDeSemana = in_array($diaSemana, [0, 6]);

            $esperados = $alumnos->filter(function ($a) use ($fecha, $diaSemana, $esFinDeSemana) {
                if ($a->fecha_ingreso && $fecha < $a->fecha_ingreso) return false;
                $dias = $this->obtenerDiasConClase($a->horarioConfig);
                return $dias !== null ? in_array($diaSemana, $dias) : !$esFinDeSemana;
            })->count();

            $total = max($asistieron, $esperados);

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
        $fechaCarbon = Carbon::parse($fecha);
        $diaSemana = $fechaCarbon->dayOfWeek;
        $esFinDeSemana = in_array($diaSemana, [0, 6]);
        $hoyStr = Carbon::today()->toDateString();
        $esHoy = ($fecha === $hoyStr);
        $esFuturo = ($fecha > $hoyStr);

        $alumnos = Alumno::where('estatus', 'activo')
            ->with(['cintaConfig', 'horarioConfig'])
            ->get();

        $registros = Asistencia::where('fecha', $fecha)
            ->get()
            ->keyBy('alumno_id');

        $listaAlumnos = [];

        foreach ($alumnos as $alumno) {
            $registro = $registros->get($alumno->id);

            // Si tiene registro explícito en BD:
            if ($registro) {
                $listaAlumnos[] = [
                    'id'               => $alumno->id,
                    'nombre'           => $alumno->nombre,
                    'apellido_paterno' => $alumno->apellido_paterno,
                    'apellido_materno' => $alumno->apellido_materno,
                    'foto_url'         => $alumno->foto_url,
                    'cinta_config'     => $alumno->cintaConfig,
                    'horario_config'   => $alumno->horarioConfig,
                    'asistio'          => (bool) $registro->presente,
                ];
                continue;
            }

            // Si no tiene registro, verificar si le correspondía clase
            if ($alumno->fecha_ingreso && $fecha < $alumno->fecha_ingreso) {
                continue;
            }

            $diasConClase = $this->obtenerDiasConClase($alumno->horarioConfig);
            $tieneClase = $diasConClase !== null
                ? in_array($diaSemana, $diasConClase)
                : !$esFinDeSemana;

            if (!$tieneClase) {
                continue; // No le correspondía clase este día
            }

            // Si es fecha futura, no lo listamos como falta aún
            if ($esFuturo) {
                continue;
            }

            // Si es hoy, verificar si ya terminó su clase
            if ($esHoy) {
                $horaFin = $alumno->horarioConfig && $alumno->horarioConfig->hora_fin
                    ? $alumno->horarioConfig->hora_fin
                    : '20:00:00';
                if (Carbon::now()->format('H:i:s') < $horaFin) {
                    // La clase aún no ocurre o está en curso
                    continue;
                }
            }

            // Le correspondía clase y no asistió: FALTÓ
            $listaAlumnos[] = [
                'id'               => $alumno->id,
                'nombre'           => $alumno->nombre,
                'apellido_paterno' => $alumno->apellido_paterno,
                'apellido_materno' => $alumno->apellido_materno,
                'foto_url'         => $alumno->foto_url,
                'cinta_config'     => $alumno->cintaConfig,
                'horario_config'   => $alumno->horarioConfig,
                'asistio'          => false,
            ];
        }

        $colAlumnos = collect($listaAlumnos);
        $total      = $colAlumnos->count();
        $asistieron = $colAlumnos->where('asistio', true)->count();
        $faltaron   = $colAlumnos->where('asistio', false)->count();
        $pct        = $total > 0 ? (int) round(($asistieron / $total) * 100) : 0;

        return response()->json([
            'fecha'   => $fecha,
            'stats'   => [
                'total'      => $total,
                'asistieron' => $asistieron,
                'faltaron'   => $faltaron,
                'pct'        => $pct,
            ],
            'alumnos' => $colAlumnos->values(),
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
        $ahora = now();

        // Obtener todos los alumnos involucrados con su horarioConfig cargado en 1 sola consulta
        $alumnoIds = collect($request->asistencias)->pluck('alumno_id')->toArray();
        $alumnos = Alumno::with('horarioConfig')->whereIn('id', $alumnoIds)->get()->keyBy('id');
        $tenantId = auth()->user()?->tenant_id ?? $alumnos->first()?->tenant_id;

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
        \Illuminate\Support\Facades\DB::transaction(function () use ($recordsToUpsert, $recordsToDelete, $request, $tenantId) {
            if (!empty($recordsToUpsert)) {
                Asistencia::upsert(
                    $recordsToUpsert,
                    ['alumno_id', 'fecha'],
                    ['presente', 'updated_at']
                );
            }

            if (!empty($recordsToDelete)) {
                $deleteQuery = Asistencia::whereIn('alumno_id', $recordsToDelete)
                    ->where('fecha', $request->fecha);
                if ($tenantId) {
                    $deleteQuery->where('tenant_id', $tenantId);
                }
                $deleteQuery->delete();
            }
        });

        return response()->json(['message' => 'Asistencias registradas correctamente']);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Retorna un array con todas las fechas (YYYY-MM-DD) del mes dado en las que
     * el alumno tenía programada clase, respetando:
     * 1. Su fecha de ingreso (no cuenta antes de entrar).
     * 2. Los días configurados en su horario (o lunes a viernes por defecto).
     * 3. No cuenta fechas futuras ni clases de hoy que aún no hayan terminado.
     */
    private function obtenerFechasClaseAlumno($alumno, int $anio, int $mesNum, ?string $fechaLimite = null): array
    {
        $diasEnMes = cal_days_in_month(CAL_GREGORIAN, $mesNum, $anio);
        $diasConClaseSet = $this->obtenerDiasConClase($alumno->horarioConfig);

        $hoy = Carbon::today();
        $hoyStr = $hoy->toDateString();
        $horaFin = $alumno->horarioConfig && $alumno->horarioConfig->hora_fin
            ? $alumno->horarioConfig->hora_fin
            : '20:00:00';
        $claseHoyPaso = Carbon::now()->format('H:i:s') >= $horaFin;

        $fechaIngreso = $alumno->fecha_ingreso ? Carbon::parse($alumno->fecha_ingreso)->toDateString() : null;
        $limiteStr = $fechaLimite ?? $hoyStr;

        $fechas = [];
        for ($d = 1; $d <= $diasEnMes; $d++) {
            $fechaStr = sprintf('%04d-%02d-%02d', $anio, $mesNum, $d);

            // Si es posterior al límite permitido
            if ($fechaStr > $limiteStr) {
                continue;
            }

            // Si es hoy pero la clase todavía no termina
            if ($fechaStr === $hoyStr && !$claseHoyPaso) {
                continue;
            }

            // Si es anterior a la fecha de ingreso
            if ($fechaIngreso && $fechaStr < $fechaIngreso) {
                continue;
            }

            $diaSemana = Carbon::parse($fechaStr)->dayOfWeek; // 0=Dom, 6=Sab
            $esFinDeSemana = in_array($diaSemana, [0, 6]);

            $tieneClase = false;
            if ($diasConClaseSet !== null) {
                $tieneClase = in_array($diaSemana, $diasConClaseSet);
            } else {
                $tieneClase = !$esFinDeSemana;
            }

            if ($tieneClase) {
                $fechas[] = $fechaStr;
            }
        }

        return $fechas;
    }

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