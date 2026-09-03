<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAlumnoRequest;
use App\Http\Requests\UpdateAlumnoRequest;
use App\Services\SupabaseStorageService;
use App\Models\Alumno;
use App\Models\Asistencia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

use App\Models\HistorialGrado;
use Illuminate\Support\Facades\Gate;

class AlumnoController extends Controller
{
    public function addHistorialManual(Request $request, Alumno $alumno)
    {
        Gate::authorize('update', $alumno);

        $validated = $request->validate([
            'grado_anterior_id' => 'nullable|exists:configuraciones_cintas,id',
            'grado_nuevo_id'    => 'required|exists:configuraciones_cintas,id',
            'fecha_ascenso'     => 'required|date',
            'comentario'        => 'nullable|string',
            'actualizar_cinta'  => 'boolean'
        ]);

        $historial = HistorialGrado::create([
            'alumno_id'        => $alumno->id,
            'grado_anterior_id' => $validated['grado_anterior_id'],
            'grado_nuevo_id'   => $validated['grado_nuevo_id'],
            'fecha_ascenso'    => $validated['fecha_ascenso'],
            'evento_id'        => null, // Registro manual
        ]);

        if ($request->boolean('actualizar_cinta')) {
            $alumno->update(['configuracion_cinta_id' => $validated['grado_nuevo_id']]);
        }

        return response()->json(['message' => 'Historial agregado correctamente', 'historial' => $historial]);
    }

    public function index(Request $request)
    {
        Gate::authorize('viewAny', Alumno::class);

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
        Gate::authorize('create', Alumno::class);

        $validated = $request->validated();

        if ($request->hasFile('foto') && $request->file('foto')->isValid()) {
            try {
                $file = $request->file('foto');
                $customName = 'alumno_' . time() . '_' . Str::random(6) . '.' . ($file->getClientOriginalExtension() ?: 'jpg');
                $tenantNombre = auth()->user()?->tenant?->nombre ?? 'tigres-do';
                $validated['foto'] = SupabaseStorageService::upload($file, 'alumnos', $customName, $tenantNombre);
            } catch (\Throwable $eFile) {
                unset($validated['foto']);
            }
        }

        $alumno = Alumno::create($validated);
        return response()->json($alumno, 201);
    }

    public function show(Alumno $alumno)
    {
        Gate::authorize('view', $alumno);

        return response()->json($alumno->load([
            'pagos', 
            'asistencias', 
            'cintaConfig', 
            'historialGrados.gradoAnterior', 
            'historialGrados.gradoNuevo', 
            'historialGrados.evento'
        ]));
    }

    public function update(UpdateAlumnoRequest $request, Alumno $alumno)
    {
        Gate::authorize('update', $alumno);

        $validated = $request->validated();

        if ($request->has('eliminar_foto') && $request->eliminar_foto == '1') {
            if ($alumno->foto) {
                SupabaseStorageService::delete($alumno->foto);
            }
            $validated['foto'] = null;
        }

        if ($request->hasFile('foto') && $request->file('foto')->isValid()) {
            try {
                if ($alumno->foto) {
                    SupabaseStorageService::delete($alumno->foto);
                }
                $file = $request->file('foto');
                $customName = 'alumno_' . $alumno->id . '_' . time() . '.' . ($file->getClientOriginalExtension() ?: 'jpg');
                $tenantNombre = $alumno->tenant?->nombre ?? auth()->user()?->tenant?->nombre ?? 'tigres-do';
                $validated['foto'] = SupabaseStorageService::upload($file, 'alumnos', $customName, $tenantNombre);
            } catch (\Throwable $eFile) {
                unset($validated['foto']);
            }
        }

        $alumno->update($validated);
        return response()->json($alumno);
    }

    public function quitarFoto(Alumno $alumno)
    {
        Gate::authorize('update', $alumno);

        if ($alumno->foto) {
            SupabaseStorageService::delete($alumno->foto);
            $alumno->foto = null;
            $alumno->save();
        }

        return response()->json(['message' => 'Foto eliminada', 'foto' => null]);
    }

    public function destroy(Alumno $alumno)
    {
        Gate::authorize('delete', $alumno);

        if ($alumno->foto) {
            Storage::disk('public')->delete($alumno->foto);
        }
        $alumno->delete();
        return response()->json(['message' => 'Alumno eliminado correctamente']);
    }

    public function toggleEstatus(Alumno $alumno)
    {
        Gate::authorize('update', $alumno);

        $alumno->estatus = $alumno->estatus === 'activo' ? 'inactivo' : 'activo';
        $alumno->save();
        return response()->json($alumno);
    }

    public function perfil(Alumno $alumno)
    {
        Gate::authorize('view', $alumno);

        // Cargar relaciones del alumno
        $alumno->load(['cintaConfig', 'horarioConfig']);

        // Fechas de asistencias
        $asistencias = $alumno->asistencias()->orderBy('fecha', 'desc')->get();

        // 1. Calcular racha de asistencia (clases consecutivas presente = 1)
        $racha_asistencia = 0;
        foreach ($asistencias as $asist) {
            if ($asist->presente == 1) {
                $racha_asistencia++;
            } else {
                break;
            }
        }

        // 2. Última falta
        $ultima_falta = $alumno->asistencias()
            ->where('presente', 0)
            ->orderBy('fecha', 'desc')
            ->first();

        // 3. Últimas 30 clases (presente: 1 o 0) - en orden cronológico (antiguo a reciente)
        $ultimas_30_clases = $alumno->asistencias()
            ->orderBy('fecha', 'desc')
            ->take(30)
            ->get()
            ->reverse()
            ->pluck('presente')
            ->map(fn($p) => (int)$p)
            ->values()
            ->toArray();

        // 4. Pago pendiente
        $pago_pendiente_raw = $alumno->pagos()
            ->where('estado', '!=', 'pagado')
            ->orderBy('fecha_inicio', 'desc')
            ->first();

        $meses = [
            1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril',
            5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
            9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre'
        ];

        $formatDate = function ($date) {
            if (!$date) return null;
            if ($date instanceof \Carbon\Carbon) {
                return $date->toDateString();
            }
            if (is_string($date)) {
                return \Carbon\Carbon::parse($date)->toDateString();
            }
            if (method_exists($date, 'format')) {
                return $date->format('Y-m-d');
            }
            return null;
        };

        $getConcepto = function ($pago) use ($meses) {
            if ($pago->tipo === 'mensualidad' && $pago->fecha_inicio) {
                $c = \Carbon\Carbon::parse($pago->fecha_inicio);
                return 'Mensualidad ' . $meses[$c->month] . ' ' . $c->year;
            }
            return $pago->tipo === 'inscripcion' ? 'Inscripción' : 'Pago';
        };

        $pago_pendiente = null;
        if ($pago_pendiente_raw) {
            $pago_pendiente = [
                'concepto' => $getConcepto($pago_pendiente_raw),
                'monto'    => $pago_pendiente_raw->monto,
                'vence'    => $pago_pendiente_raw->fecha_fin ?? $pago_pendiente_raw->fecha_inicio,
            ];
        }

        // 5. Historial de pagos
        $historial_pagos = $alumno->pagos()
            ->orderBy('fecha_inicio', 'desc')
            ->get()
            ->map(function ($pago) use ($getConcepto, $formatDate) {
                return [
                    'id'          => $pago->id,
                    'concepto'    => $getConcepto($pago),
                    'tipo'        => $pago->tipo ?? 'mensualidad',
                    'monto'       => $pago->monto,
                    'fecha_pago'  => $formatDate($pago->fecha_pago),
                    'metodo_pago' => $pago->metodo_pago ?? 'efectivo',
                    'estado'      => $pago->estado,
                ];
            });

        // 6. Historial de exámenes
        $historial_examenes = $alumno->examenesDetalle()
            ->with(['evento', 'gradoActual', 'gradoSiguiente'])
            ->get()
            ->map(function ($ex) use ($formatDate) {
                return [
                    'id'             => $ex->id,
                    'nombre'         => $ex->evento?->nombre ?? 'Examen',
                    'fecha'          => $ex->evento?->fecha ? $formatDate($ex->evento->fecha) : $formatDate($ex->created_at),
                    'grado_anterior' => $ex->gradoActual?->nombre_nivel ?? 'Sin cinta',
                    'grado_nuevo'    => $ex->gradoSiguiente?->nombre_nivel ?? 'Sin cinta',
                    'resultado'      => $ex->resultado ?? 'aprobado',
                ];
            });

        // 7. Historial de eventos (Torneos)
        $torneos = $alumno->torneosDetalle()
            ->with(['evento', 'modalidades'])
            ->get();

        $historial_eventos = [];
        foreach ($torneos as $torneo) {
            if ($torneo->modalidades->count() > 0) {
                foreach ($torneo->modalidades as $mod) {
                    $historial_eventos[] = [
                        'id'        => $mod->id,
                        'nombre'    => $torneo->evento?->nombre ?? 'Torneo',
                        'tipo'      => 'torneo',
                        'fecha'     => $torneo->evento?->fecha ? $formatDate($torneo->evento->fecha) : $formatDate($torneo->created_at),
                        'resultado' => $mod->pivot?->resultado ?? $torneo->resultado ?? '-',
                        'modalidad' => $mod->nombre,
                    ];
                }
            } else {
                $historial_eventos[] = [
                    'id'        => $torneo->id,
                    'nombre'    => $torneo->evento?->nombre ?? 'Torneo',
                    'tipo'      => 'torneo',
                    'fecha'     => $torneo->evento?->fecha ? $formatDate($torneo->evento->fecha) : $formatDate($torneo->created_at),
                    'resultado' => $torneo->resultado ?? '-',
                    'modalidad' => 'General',
                ];
            }
        }

        // 8. Stats
        // Pagos aprobados/completados
        $pagos_realizados = $alumno->pagos()->where('estado', 'pagado')->get();
        $total_pagos = $pagos_realizados->count();
        $monto_acumulado = $pagos_realizados->sum('monto');

        // Asistencias últimos 90 días
        $limite90 = \Carbon\Carbon::now()->subDays(90)->toDateString();
        $asistencias90 = $alumno->asistencias()->where('fecha', '>=', $limite90)->get();
        $total_asistencias90 = $asistencias90->count();
        $presentes90 = $asistencias90->where('presente', 1)->count();
        $pct_asistencia = $total_asistencias90 > 0 ? round(($presentes90 / $total_asistencias90) * 100) : 0;

        // Variación vs mes anterior
        $inicioMesActual = \Carbon\Carbon::now()->startOfMonth()->toDateString();
        $finMesActual = \Carbon\Carbon::now()->endOfMonth()->toDateString();
        $inicioMesAnterior = \Carbon\Carbon::now()->subMonth()->startOfMonth()->toDateString();
        $finMesAnterior = \Carbon\Carbon::now()->subMonth()->endOfMonth()->toDateString();

        $asistAct = $alumno->asistencias()
            ->whereBetween('fecha', [$inicioMesActual, $finMesActual])
            ->get();
        $pctAct = $asistAct->count() > 0 ? round(($asistAct->where('presente', 1)->count() / $asistAct->count()) * 100) : 0;

        $asistPrev = $alumno->asistencias()
            ->whereBetween('fecha', [$inicioMesAnterior, $finMesAnterior])
            ->get();
        $pctPrev = $asistPrev->count() > 0 ? round(($asistPrev->where('presente', 1)->count() / $asistPrev->count()) * 100) : 0;

        $variacion_asistencia = $asistAct->count() > 0 && $asistPrev->count() > 0 ? ($pctAct - $pctPrev) : 0;

        // Exámenes
        $total_examenes = $alumno->examenesDetalle()->count();
        $examenes_aprobados = $alumno->examenesDetalle()->where('resultado', 'aprobado')->count();

        // Torneos
        $total_torneos = $torneos->count();

        $stats = [
            'total_pagos'          => $total_pagos,
            'monto_acumulado'      => $monto_acumulado,
            'pct_asistencia'       => $pct_asistencia,
            'variacion_asistencia' => $variacion_asistencia,
            'total_examenes'       => $total_examenes,
            'examenes_aprobados'   => $examenes_aprobados,
            'total_torneos'        => $total_torneos,
        ];

        // 9. Cintas config de la escuela
        $cintas_config = \App\Models\ConfiguracionCinta::forTenant($alumno->tenant_id)->get();

        $escuela = \App\Models\Escuela::where('tenant_id', $alumno->tenant_id)->first();
        $academia = $escuela ? $escuela->nombre : '-';
        $fecha_registro = $alumno->created_at ? $alumno->created_at->toDateString() : null;
        $dias_asistencia = $alumno->horarioConfig?->dias ?? '-';

        return response()->json([
            'alumno'             => $alumno,
            'stats'              => $stats,
            'pago_pendiente'     => $pago_pendiente,
            'historial_pagos'    => $historial_pagos,
            'historial_examenes' => $historial_examenes,
            'historial_eventos'  => $historial_eventos,
            'racha_asistencia'   => $racha_asistencia,
            'ultima_falta'       => $ultima_falta ? $ultima_falta->fecha : null,
            'ultimas_30_clases'  => $ultimas_30_clases,
            'cintas_config'      => $cintas_config,
            'academia'           => $academia,
            'fecha_registro'     => $fecha_registro,
            'dias_asistencia'    => $dias_asistencia,
        ]);
    }
}