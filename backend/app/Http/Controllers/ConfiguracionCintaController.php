<?php

namespace App\Http\Controllers;

use App\Models\ConfiguracionCinta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ConfiguracionCintaController extends Controller
{
    public function index(Request $request)
    {
        return ConfiguracionCinta::delTenant()->get();
    }

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

            $tenantId = auth()->user()->tenant_id;
            $validated['tenant_id'] = $tenantId;
            
            if (empty($validated['categoria_label'])) {
                $validated['categoria_label'] = $validated['nombre_nivel'];
            }
            if (empty($validated['orden'])) {
                $validated['orden'] = 0;
            }

            $cinta = ConfiguracionCinta::create($validated);
            Cache::forget("cintas_tenant_{$tenantId}");
            return response()->json($cinta, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error interno: ' . $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $cinta = ConfiguracionCinta::findOrFail($id);
            
            $validated = $request->validate([
                'nombre_nivel'    => 'sometimes|string|max:100',
                'color_hex'       => 'sometimes|string|max:7',
                'color_texto'     => 'sometimes|string|max:7',
                'orden'           => 'sometimes|integer',
                'categoria_label' => 'sometimes|string|max:50',
            ]);

            $cinta->update($validated);
            Cache::forget("cintas_tenant_" . auth()->user()->tenant_id);
            return response()->json($cinta);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al actualizar: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $cinta = ConfiguracionCinta::findOrFail($id);
            $tenantId = $cinta->tenant_id;
            $cinta->delete();
            Cache::forget("cintas_tenant_{$tenantId}");
            return response()->json(['message' => 'Cinta eliminada']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al eliminar: ' . $e->getMessage()], 500);
        }
    }
}