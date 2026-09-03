<?php

namespace App\Http\Controllers;

use App\Models\Evento;
use App\Models\Alumno;
use App\Models\ExamenAlumno;
use App\Models\HistorialGrado;
use App\Models\TorneoAlumno;
use App\Models\ConfiguracionCinta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class EventoAlumnoController extends Controller
{
    // ──────────────────────────────────────────────
    // GET inscritos de un evento con sus detalles
    // ──────────────────────────────────────────────
    public function getInscritos(Evento $evento)
    {
        $inscritos = $evento->alumnos()
            ->with('cintaConfig')
            ->get();
            
        $examenes = collect();
        $torneos = collect();

        if ($evento->tipo === 'examen') {
            $examenes = ExamenAlumno::with(['gradoActual', 'gradoSiguiente'])
                ->where('evento_id', $evento->id)
                ->whereIn('alumno_id', $inscritos->pluck('id'))
                ->get()
                ->keyBy('alumno_id');
        } elseif ($evento->tipo === 'torneo') {
            $torneos = TorneoAlumno::with(['modalidades'])
                ->where('evento_id', $evento->id)
                ->whereIn('alumno_id', $inscritos->pluck('id'))
                ->get()
                ->keyBy('alumno_id');
        }

        $resultado = $inscritos->map(function ($alumno) use ($evento, $examenes, $torneos) {
            $data = $alumno->toArray();
            $data['pivot_id']   = $alumno->pivot->id;
            $data['pagado']     = $alumno->pivot->pagado;
            $data['fecha_pago'] = $alumno->pivot->fecha_pago;
            $data['asistio']    = $alumno->pivot->asistio;
            $data['pago_inscripcion'] = $alumno->pivot->pago_inscripcion;
            $data['pivot_created_at'] = $alumno->pivot->created_at;

            if ($evento->tipo === 'examen') {
                $data['examen_detalle'] = $examenes->get($alumno->id);
            } elseif ($evento->tipo === 'torneo') {
                $data['torneo_detalle'] = $torneos->get($alumno->id);
            }

            return $data;
        });

        return response()->json($resultado);
    }

    // ──────────────────────────────────────────────
    // POST inscribir alumno al evento
    // ──────────────────────────────────────────────
    public function inscribir(Request $request, Evento $evento)
    {
        $rules = [
            'alumno_id'           => 'required|exists:alumnos,id',
            'pagado'              => 'boolean',
            'fecha_pago'          => 'nullable|date',
        ];

        if ($evento->tipo === 'examen') {
            $rules['grado_actual_id']    = 'required|exists:configuraciones_cintas,id';
            $rules['grado_siguiente_id'] = 'required|exists:configuraciones_cintas,id';
            $rules['costo_examen']       = 'nullable|numeric|min:0';
        } elseif ($evento->tipo === 'torneo') {
            $rules['costo_torneo']       = 'nullable|numeric|min:0';
            $rules['modalidad_ids']      = 'nullable|array';
            $rules['modalidad_ids.*']    = 'exists:torneo_modalidades,id';
        }

        $validated = $request->validate($rules);

        if ($evento->alumnos()->where('alumno_id', $validated['alumno_id'])->exists()) {
            return response()->json(['message' => 'El alumno ya está inscrito en este evento'], 400);
        }

        DB::transaction(function () use ($evento, $validated) {
            $costo = 0;
            if ($evento->tipo === 'examen') {
                $costo = $validated['costo_examen'] ?? 0;
            } elseif ($evento->tipo === 'torneo') {
                $costo = $validated['costo_torneo'] ?? 0;
            }

            // 1. Registro base con resultado inicial y monto
            $evento->alumnos()->attach($validated['alumno_id'], [
                'pagado'           => $validated['pagado'] ?? false,
                'fecha_pago'       => $validated['fecha_pago'] ?? null,
                'pago_inscripcion' => $costo
            ]);

            $pivotId = DB::table('evento_alumno')
                ->where('evento_id', $evento->id)
                ->where('alumno_id', $validated['alumno_id'])
                ->orderBy('id', 'desc')
                ->value('id');

            // 2. Detalle según tipo
            if ($evento->tipo === 'examen') {
                ExamenAlumno::create([
                    'evento_id'          => $evento->id,
                    'alumno_id'          => $validated['alumno_id'],
                    'evento_alumno_id'   => $pivotId,
                    'grado_actual_id'    => $validated['grado_actual_id'],
                    'grado_siguiente_id' => $validated['grado_siguiente_id'],
                    'costo_examen'       => $validated['costo_examen'] ?? null,
                    'resultado'          => 'pendiente',
                ]);
            } elseif ($evento->tipo === 'torneo') {
                $ta = TorneoAlumno::create([
                    'evento_id'          => $evento->id,
                    'alumno_id'          => $validated['alumno_id'],
                    'evento_alumno_id'   => $pivotId,
                    'costo_torneo'       => $validated['costo_torneo'] ?? null,
                    'resultado'          => 'pendiente',
                ]);

                // Inscribir en modalidades seleccionadas
                if (!empty($validated['modalidad_ids'])) {
                    $ta->modalidades()->attach($validated['modalidad_ids']);
                }
            }
        });

        return response()->json(['message' => 'Alumno inscrito correctamente'], 201);
    }

    // ──────────────────────────────────────────────
    // POST inscribir masivo
    // ──────────────────────────────────────────────
    public function inscribirMasivo(Request $request, Evento $evento)
    {
        $validated = $request->validate([
            'alumnos'                      => 'required|array',
            'alumnos.*.alumno_id'          => 'required|exists:alumnos,id',
            'alumnos.*.costo_examen'       => 'nullable|numeric|min:0',
            'alumnos.*.grado_actual_id'    => 'nullable|exists:configuraciones_cintas,id',
            'alumnos.*.grado_siguiente_id' => 'nullable|exists:configuraciones_cintas,id',
            'alumnos.*.pagado'             => 'boolean',
        ]);

        $alumnoIds = collect($validated['alumnos'])->pluck('alumno_id');

        $yaInscritos = $evento->alumnos()->whereIn('alumno_id', $alumnoIds)->pluck('alumnos.id')->toArray();

        $nuevos = collect($validated['alumnos'])->filter(function ($item) use ($yaInscritos) {
            return !in_array($item['alumno_id'], $yaInscritos);
        });

        if ($nuevos->isEmpty()) {
            return response()->json([
                'message' => 'Todos los alumnos ya estaban inscritos',
                'inscritos' => []
            ], 200);
        }

        DB::transaction(function () use ($evento, $nuevos) {
            $pivotRecords = [];
            foreach ($nuevos as $item) {
                $pivotRecords[$item['alumno_id']] = [
                    'pagado' => $item['pagado'] ?? false,
                    'fecha_pago' => (!empty($item['pagado'])) ? now() : null,
                    'pago_inscripcion' => $item['costo_examen'] ?? 0,
                ];
            }
            $evento->alumnos()->attach($pivotRecords);

            if ($evento->tipo === 'examen') {
                $nuevosPivot = DB::table('evento_alumno')
                    ->where('evento_id', $evento->id)
                    ->whereIn('alumno_id', $nuevos->pluck('alumno_id'))
                    ->get()
                    ->keyBy('alumno_id');

                $examenRecords = [];
                foreach ($nuevos as $item) {
                    $pivotId = $nuevosPivot->get($item['alumno_id'])->id;
                    $examenRecords[] = [
                        'evento_id' => $evento->id,
                        'alumno_id' => $item['alumno_id'],
                        'evento_alumno_id' => $pivotId,
                        'grado_actual_id' => $item['grado_actual_id'] ?? null,
                        'grado_siguiente_id' => $item['grado_siguiente_id'] ?? null,
                        'costo_examen' => $item['costo_examen'] ?? null,
                        'resultado' => 'pendiente',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                ExamenAlumno::insert($examenRecords);
            }
        });

        return response()->json([
            'message' => 'Alumnos inscritos masivamente',
            'count' => $nuevos->count(),
            'inscritos' => $nuevos->pluck('alumno_id')
        ], 201);
    }

    // ──────────────────────────────────────────────
    // PUT actualizar pago / asistencia / resultado
    // ──────────────────────────────────────────────
    public function actualizarInscripcion(Request $request, Evento $evento, Alumno $alumno)
    {
        $validated = $request->validate([
            'pagado'             => 'nullable|boolean',
            'fecha_pago'         => 'nullable|date',
            'asistio'            => 'nullable|boolean',
            // Examen
            'resultado_examen'   => 'nullable|in:pendiente,aprobado,reprobado',
            'costo_examen'       => 'nullable|numeric|min:0',
            'grado_actual_id'    => 'nullable|exists:configuraciones_cintas,id',
            'grado_siguiente_id' => 'nullable|exists:configuraciones_cintas,id',
            'es_historico'       => 'nullable|boolean',
            // Torneo
            'resultado_torneo'   => 'nullable|in:oro,plata,bronce,eliminado,pendiente',
            'costo_torneo'       => 'nullable|numeric|min:0',
        ]);

        DB::transaction(function () use ($evento, $alumno, $validated) {
            // Actualizar pivot base
            $pivotData = [];
            if (array_key_exists('pagado', $validated))     $pivotData['pagado']     = $validated['pagado'];
            if (array_key_exists('fecha_pago', $validated)) $pivotData['fecha_pago'] = $validated['fecha_pago'] ?? ($validated['pagado'] ? now() : null);
            if (array_key_exists('asistio', $validated))    $pivotData['asistio']    = $validated['asistio'];
            
            // Sincronizar costo al pivot
            if (isset($validated['costo_examen']))          $pivotData['pago_inscripcion'] = $validated['costo_examen'];
            if (isset($validated['costo_torneo']))          $pivotData['pago_inscripcion'] = $validated['costo_torneo'];

            if (!empty($pivotData)) {
                $evento->alumnos()->updateExistingPivot($alumno->id, $pivotData);
            }

            // Actualizar detalle examen
            if ($evento->tipo === 'examen') {
                $examen = ExamenAlumno::where('evento_id', $evento->id)->where('alumno_id', $alumno->id)->first();
                if ($examen) {
                    $oldResultado = $examen->resultado;
                    if (isset($validated['resultado_examen'])) $examen->resultado = $validated['resultado_examen'];
                    
                    if (isset($validated['costo_examen'])) {
                        $examen->costo_examen = $validated['costo_examen'];
                    }

                    if (isset($validated['es_historico'])) {
                        $examen->es_historico = $validated['es_historico'];
                    }

                    if (isset($validated['grado_actual_id'])) {
                        $examen->grado_actual_id = $validated['grado_actual_id'];
                    }

                    if (isset($validated['grado_siguiente_id'])) {
                        $examen->grado_siguiente_id = $validated['grado_siguiente_id'];
                    }
                    
                    $examen->save();

                    // PROMOCIÓN AUTOMÁTICA si cambia a aprobado
                    if (isset($validated['resultado_examen']) && $oldResultado !== 'aprobado' && $validated['resultado_examen'] === 'aprobado') {
                        HistorialGrado::create([
                            'alumno_id'        => $alumno->id,
                            'evento_id'        => $evento->id,
                            'grado_anterior_id' => $examen->grado_actual_id,
                            'grado_nuevo_id'   => $examen->grado_siguiente_id,
                            'fecha_ascenso'    => today(),
                        ]);

                        // SOLO ACTUALIZAR ALUMNO SI NO ES HISTÓRICO
                        if (!$examen->es_historico) {
                            $alumno->update(['configuracion_cinta_id' => $examen->grado_siguiente_id]);
                        }
                    }

                    // REVERSIÓN AUTOMÁTICA si cambia de aprobado a pendiente o reprobado
                    if (isset($validated['resultado_examen']) && $oldResultado === 'aprobado' && $validated['resultado_examen'] !== 'aprobado') {
                        HistorialGrado::where('alumno_id', $alumno->id)
                            ->where('evento_id', $evento->id)
                            ->delete();

                        if (!$examen->es_historico && $alumno->configuracion_cinta_id == $examen->grado_siguiente_id) {
                            $alumno->update(['configuracion_cinta_id' => $examen->grado_actual_id]);
                        }
                    }
                }
            }

            // Actualizar detalle torneo
            if ($evento->tipo === 'torneo') {
                $torneoData = [];
                if (isset($validated['resultado_torneo'])) $torneoData['resultado']   = $validated['resultado_torneo'];
                if (isset($validated['costo_torneo']))     $torneoData['costo_torneo'] = $validated['costo_torneo'];
                if (!empty($torneoData)) {
                    TorneoAlumno::where('evento_id', $evento->id)
                        ->where('alumno_id', $alumno->id)
                        ->update($torneoData);
                }
            }
        });

        return response()->json(['message' => 'Inscripción actualizada']);
    }

    // ──────────────────────────────────────────────
    // DELETE eliminar inscripción
    // ──────────────────────────────────────────────
    public function eliminarInscripcion(Evento $evento, Alumno $alumno)
    {
        DB::transaction(function () use ($evento, $alumno) {
            if ($evento->tipo === 'examen') {
                $examen = ExamenAlumno::where('evento_id', $evento->id)->where('alumno_id', $alumno->id)->first();
                if ($examen) {
                    if ($examen->resultado === 'aprobado') {
                        HistorialGrado::where('alumno_id', $alumno->id)
                            ->where('evento_id', $evento->id)
                            ->delete();

                        if (!$examen->es_historico && $alumno->configuracion_cinta_id == $examen->grado_siguiente_id) {
                            $alumno->update(['configuracion_cinta_id' => $examen->grado_actual_id]);
                        }
                    }
                    $examen->delete();
                }
            }
            
            TorneoAlumno::where('evento_id', $evento->id)->where('alumno_id', $alumno->id)->delete();
            $evento->alumnos()->detach($alumno->id);
        });

        return response()->json(['message' => 'Inscripción eliminada']);
    }

    // ──────────────────────────────────────────────
    // POST finalizar examen y promover aprobados
    // ──────────────────────────────────────────────
    public function promoverAprobados(Request $request, Evento $evento)
    {
        if ($evento->tipo !== 'examen') {
            return response()->json(['message' => 'Este evento no es un examen'], 400);
        }

        $aprobados = ExamenAlumno::with('alumno')
            ->where('evento_id', $evento->id)
            ->where('resultado', 'aprobado')
            ->get();

        $promovidos = 0;

        DB::transaction(function () use ($aprobados, $evento, &$promovidos) {
            foreach ($aprobados as $examen) {
                $alumno = $examen->alumno;

                // Solo promover si el grado actual del alumno coincide con lo registrado en el examen
                HistorialGrado::create([
                    'alumno_id'        => $alumno->id,
                    'evento_id'        => $evento->id,
                    'grado_anterior_id' => $examen->grado_actual_id,
                    'grado_nuevo_id'   => $examen->grado_siguiente_id,
                    'fecha_ascenso'    => today(),
                ]);

                // SOLO ACTUALIZAR ALUMNO SI NO ES HISTÓRICO
                if (!$examen->es_historico) {
                    $alumno->update(['configuracion_cinta_id' => $examen->grado_siguiente_id]);
                }
                $promovidos++;
            }
        });

        return response()->json(['message' => "Se han promovido $promovidos alumnos correctamente."]);
    }

    // ──────────────────────────────────────────────
    // GET predicción de grado siguiente
    // ──────────────────────────────────────────────
    public function predecirGrado(Alumno $alumno)
    {
        $cintaActual = ConfiguracionCinta::find($alumno->configuracion_cinta_id);

        if (!$cintaActual) {
            // Si no tiene cinta, buscar la primera (orden 1 o el más bajo)
            $cintaActual = ConfiguracionCinta::orderBy('orden', 'asc')->first();
            if (!$cintaActual) return response()->json(['grado_actual' => null, 'grado_siguiente' => null]);
        }

        $siguiente = ConfiguracionCinta::where('orden', '>', $cintaActual->orden)
            ->orderBy('orden', 'asc')
            ->first();

        return response()->json([
            'grado_actual'   => $cintaActual,
            'grado_siguiente' => $siguiente ?? $cintaActual,
        ]);
    }

    // ──────────────────────────────────────────────
    // Alerta: alumnos con pago pendiente próximos X días
    // ──────────────────────────────────────────────
    public function alertasPagosPendientes(Request $request)
    {
        $dias = $request->get('dias', 7);
        $hoy  = Carbon::today();
        $limite = $hoy->copy()->addDays($dias);

        $eventos = Evento::whereBetween('fecha', [$hoy, $limite])->get();

        $alertas = [];

        foreach ($eventos as $evento) {
            $pendientes = $evento->alumnos()
                ->wherePivot('pagado', false)
                ->with('cintaConfig')
                ->get();

            if ($pendientes->isNotEmpty()) {
                $alertas[] = [
                    'evento'    => $evento,
                    'pendientes' => $pendientes,
                ];
            }
        }

        return response()->json($alertas);
    }
}
