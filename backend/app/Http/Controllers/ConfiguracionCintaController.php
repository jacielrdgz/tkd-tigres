<?php

namespace App\Http\Controllers;

use App\Models\ConfiguracionCinta;
use App\Models\Alumno;
use App\Services\DefaultCintasService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConfiguracionCintaController extends Controller
{
    private function getTenantId(): ?int
    {
        $user = auth()->user();
        return ($user && !$user->isSuperAdmin()) ? $user->tenant_id : null;
    }

    /**
     * Listar cintas del tenant (o las globales si usa el catálogo base).
     */
    public function index(Request $request)
    {
        try {
            $tenant = auth()->user()?->tenant;
            if ($tenant) {
                $config = $tenant->configuracion ?? [];
                if (empty($config['setup_confirmado']['cintas'])) {
                    $config['setup_confirmado']['cintas'] = true;
                    $tenant->update(['configuracion' => $config]);
                }
            }

            DefaultCintasService::asegurarCintasGlobales();
            $tenantId = $this->getTenantId();

            $cintas = ConfiguracionCinta::forTenant($tenantId)->get();

            // Si no devolvió nada con forTenant, verificar fallbacks
            if ($cintas->isEmpty()) {
                if ($tenantId) {
                    $cintas = ConfiguracionCinta::where('tenant_id', $tenantId)->orderBy('orden')->get();
                }
                if ($cintas->isEmpty()) {
                    $cintas = ConfiguracionCinta::whereNull('tenant_id')->orderBy('orden')->get();
                }
                if ($cintas->isEmpty()) {
                    $cintas = ConfiguracionCinta::orderBy('orden')->get();
                }
            }

            return response()->json($cintas);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Error en ConfiguracionCintaController@index: ' . $e->getMessage());
            try {
                $cintas = ConfiguracionCinta::orderBy('orden')->get();
                return response()->json($cintas);
            } catch (\Throwable $e2) {
                return response()->json([], 200);
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

            // Mapa de cintas globales
            DefaultCintasService::asegurarCintasGlobales();
            $globales = ConfiguracionCinta::globales()->get()->keyBy('nombre_nivel');

            // Reasignar alumnos que apuntaban a cintas del tenant hacia las globales
            $cintasTenant = ConfiguracionCinta::where('tenant_id', $tenantId)->get();
            foreach ($cintasTenant as $cintaTenant) {
                if (isset($globales[$cintaTenant->nombre_nivel])) {
                    $globalId = $globales[$cintaTenant->nombre_nivel]->id;
                    Alumno::where('tenant_id', $tenantId)
                        ->where('configuracion_cinta_id', $cintaTenant->id)
                        ->update(['configuracion_cinta_id' => $globalId]);
                }
            }

            // Eliminar personalizaciones del tenant
            ConfiguracionCinta::where('tenant_id', $tenantId)->delete();

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