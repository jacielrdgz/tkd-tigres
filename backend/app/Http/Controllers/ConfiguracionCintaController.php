<?php

namespace App\Http\Controllers;

use App\Models\ConfiguracionCinta;
use App\Models\Alumno;
use App\Services\DefaultCintasService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class ConfiguracionCintaController extends Controller
{
    private function getTenantId(): ?int
    {
        $user = auth()->user();
        return ($user && !$user->isSuperAdmin()) ? $user->tenant_id : null;
    }

    private function clearCintasCache(?int $tenantId = null): void
    {
        $tId = $tenantId ?? $this->getTenantId();
        Cache::forget("cintas_catalogo_tenant_" . ($tId ?? 'global'));
        Cache::forget("cintas_catalogo_tenant_global");
    }

    /**
     * Listar cintas del tenant (o las globales si usa el catálogo base).
     */
    public function index(Request $request)
    {
        try {
            $tenantId = $this->getTenantId();
            $cacheKey = "cintas_catalogo_tenant_" . ($tenantId ?? 'global');

            $cintas = Cache::remember($cacheKey, 3600, function () use ($tenantId) {
                // Solo asegurar si la tabla global está vacía
                DefaultCintasService::asegurarCintasGlobales();

                $list = ConfiguracionCinta::forTenant($tenantId)->orderBy('orden')->get();

                if ($list->isEmpty()) {
                    if ($tenantId) {
                        $list = ConfiguracionCinta::where('tenant_id', $tenantId)->orderBy('orden')->get();
                    }
                    if ($list->isEmpty()) {
                        $list = ConfiguracionCinta::whereNull('tenant_id')->orderBy('orden')->get();
                    }
                    if ($list->isEmpty()) {
                        $list = ConfiguracionCinta::orderBy('orden')->get();
                    }
                }

                return $list;
            });

            if (!$cintas || $cintas->isEmpty()) {
                Cache::forget($cacheKey);
                DefaultCintasService::asegurarCintasGlobales();
                $cintas = ConfiguracionCinta::forTenant($tenantId)->orderBy('orden')->get();
                if ($cintas->isEmpty()) {
                    $cintas = ConfiguracionCinta::orderBy('orden')->get();
                }
            }

            return response()->json($cintas ? $cintas->values() : []);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Error en ConfiguracionCintaController@index: ' . $e->getMessage());
            try {
                $cintas = ConfiguracionCinta::orderBy('orden')->get();
                if ($cintas->isEmpty()) {
                    DefaultCintasService::asegurarCintasGlobales();
                    $cintas = ConfiguracionCinta::orderBy('orden')->get();
                }
                return response()->json($cintas->values());
            } catch (\Throwable $e2) {
                return response()->json(DefaultCintasService::getCintasDefecto(), 200);
            }
        }
    }

    /**
     * Crear una nueva cinta para el tenant. Si estaba en modo global, primero materializa el catálogo.
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'nombre_nivel'    => 'required|string|max:100',
                'color_hex'       => 'required|string|max:7',
                'color_texto'     => 'required|string|max:7',
                'orden'           => 'nullable|integer',
                'categoria_label' => 'nullable|string|max:50',
            ]);

            $tenantId = $this->getTenantId();
            if (!$tenantId) {
                return response()->json(['message' => 'Acción no permitida.'], 403);
            }

            // Copy-on-Write: Si el tenant aún no tiene cintas propias, materializar copia
            if (!ConfiguracionCinta::where('tenant_id', $tenantId)->exists()) {
                DefaultCintasService::materializarCintasParaTenant($tenantId);
            }

            if (empty($validated['categoria_label'])) {
                $validated['categoria_label'] = $validated['nombre_nivel'];
            }
            if (empty($validated['orden'])) {
                $maxOrden = ConfiguracionCinta::where('tenant_id', $tenantId)->max('orden') ?? 0;
                $validated['orden'] = $maxOrden + 1;
            }

            $validated['tenant_id'] = $tenantId;
            $cinta = ConfiguracionCinta::create($validated);
            $this->clearCintasCache($tenantId);

            return response()->json($cinta, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error interno: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Actualizar una cinta. Si era global, ejecuta Copy-on-Write primero.
     */
    public function update(Request $request, $id)
    {
        try {
            $tenantId = $this->getTenantId();
            if (!$tenantId) {
                return response()->json(['message' => 'Acción no permitida.'], 403);
            }

            $cinta = ConfiguracionCinta::findOrFail($id);

            // Copy-on-Write: Si el target es global o el tenant aún no tiene cintas propias
            if ($cinta->isGlobal() || !ConfiguracionCinta::where('tenant_id', $tenantId)->exists()) {
                $mapa = DefaultCintasService::materializarCintasParaTenant($tenantId);
                $targetId = $mapa[$cinta->id] ?? null;
                if (!$targetId) {
                    $targetCinta = ConfiguracionCinta::where('tenant_id', $tenantId)
                        ->where('nombre_nivel', $cinta->nombre_nivel)
                        ->firstOrFail();
                } else {
                    $targetCinta = ConfiguracionCinta::findOrFail($targetId);
                }
            } else {
                if ($cinta->tenant_id !== $tenantId) {
                    return response()->json(['message' => 'No autorizado para modificar esta cinta.'], 403);
                }
                $targetCinta = $cinta;
            }

            $validated = $request->validate([
                'nombre_nivel'    => 'sometimes|string|max:100',
                'color_hex'       => 'sometimes|string|max:7',
                'color_texto'     => 'sometimes|string|max:7',
                'orden'           => 'sometimes|integer',
                'categoria_label' => 'sometimes|string|max:50',
            ]);

            $targetCinta->update($validated);
            $this->clearCintasCache($tenantId);
            return response()->json($targetCinta);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al actualizar: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Reordenar cintas. Soporta Copy-on-Write.
     */
    public function reorder(Request $request)
    {
        try {
            $validated = $request->validate([
                'orden'   => 'required|array',
                'orden.*' => 'integer',
            ]);

            $tenantId = $this->getTenantId();
            if (!$tenantId) {
                return response()->json(['message' => 'Acción no permitida.'], 403);
            }

            // Si el tenant no tiene cintas propias, materializar primero
            if (!ConfiguracionCinta::where('tenant_id', $tenantId)->exists()) {
                $mapa = DefaultCintasService::materializarCintasParaTenant($tenantId);
                $nuevoOrden = [];
                foreach ($validated['orden'] as $idGlobal) {
                    if (isset($mapa[$idGlobal])) {
                        $nuevoOrden[] = $mapa[$idGlobal];
                    }
                }
                $idsToOrder = $nuevoOrden;
            } else {
                $idsToOrder = $validated['orden'];
            }

            foreach ($idsToOrder as $index => $id) {
                ConfiguracionCinta::where('id', $id)
                    ->where('tenant_id', $tenantId)
                    ->update(['orden' => $index + 1]);
            }

            $this->clearCintasCache($tenantId);
            return response()->json(['message' => 'Orden actualizado correctamente']);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al reordenar: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Eliminar una cinta. Si era global, ejecuta Copy-on-Write y elimina el clon del tenant.
     */
    public function destroy($id)
    {
        try {
            $tenantId = $this->getTenantId();
            if (!$tenantId) {
                return response()->json(['message' => 'Acción no permitida.'], 403);
            }

            $cinta = ConfiguracionCinta::findOrFail($id);

            if ($cinta->isGlobal() || !ConfiguracionCinta::where('tenant_id', $tenantId)->exists()) {
                $mapa = DefaultCintasService::materializarCintasParaTenant($tenantId);
                $targetId = $mapa[$cinta->id] ?? null;
                if ($targetId) {
                    ConfiguracionCinta::where('id', $targetId)->where('tenant_id', $tenantId)->delete();
                }
            } else {
                if ($cinta->tenant_id !== $tenantId) {
                    return response()->json(['message' => 'No autorizado para eliminar esta cinta.'], 403);
                }
                $cinta->delete();
            }

            $this->clearCintasCache($tenantId);
            return response()->json(['message' => 'Cinta eliminada correctamente']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al eliminar: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Restablecer al catálogo global por defecto (elimina copias personalizadas del tenant).
     */
    public function resetToDefault(Request $request)
    {
        try {
            $tenantId = $this->getTenantId();
            if (!$tenantId) {
                return response()->json(['message' => 'Acción no permitida.'], 403);
            }

            // Mapa de cintas globales por orden y por nombre
            DefaultCintasService::asegurarCintasGlobales();
            $globales = ConfiguracionCinta::globales()->orderBy('orden')->get();
            $globalesByOrden = $globales->keyBy('orden');
            $globalesByName = $globales->keyBy('nombre_nivel');
            $primeraGlobal = $globales->first();

            // Reasignar alumnos e instructores que apuntaban a cintas del tenant hacia las globales
            $cintasTenant = ConfiguracionCinta::where('tenant_id', $tenantId)->get();
            foreach ($cintasTenant as $cintaTenant) {
                // 1. Mapear por orden jerárquico (conserva el grado aunque se le haya cambiado el nombre)
                // 2. Si no, mapear por nombre exacto
                $globalCinta = $globalesByOrden[$cintaTenant->orden]
                    ?? $globalesByName[$cintaTenant->nombre_nivel]
                    ?? $primeraGlobal;

                if ($globalCinta) {
                    $globalId = $globalCinta->id;

                    Alumno::where('tenant_id', $tenantId)
                        ->where('configuracion_cinta_id', $cintaTenant->id)
                        ->update(['configuracion_cinta_id' => $globalId]);

                    \App\Models\Instructor::where('tenant_id', $tenantId)
                        ->where('configuracion_cinta_id', $cintaTenant->id)
                        ->update(['configuracion_cinta_id' => $globalId]);
                }
            }

            // Eliminar personalizaciones del tenant
            ConfiguracionCinta::where('tenant_id', $tenantId)->delete();

            // Sanación: si algún alumno quedó con cinta huérfana o nula en este tenant, asignarle la global correspondiente
            if ($primeraGlobal) {
                $validGlobalIds = $globales->pluck('id')->toArray();
                Alumno::where('tenant_id', $tenantId)
                    ->where(function ($q) use ($validGlobalIds) {
                        $q->whereNull('configuracion_cinta_id')
                          ->orWhereNotIn('configuracion_cinta_id', $validGlobalIds);
                    })
                    ->update(['configuracion_cinta_id' => $primeraGlobal->id]);
            }

            $this->clearCintasCache($tenantId);
            $cintas = ConfiguracionCinta::forTenant($tenantId)->get();
            return response()->json([
                'message' => 'Cintas restablecidas a los valores por defecto exitosamente.',
                'cintas'  => $cintas
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al restablecer cintas: ' . $e->getMessage()], 500);
        }
    }
}