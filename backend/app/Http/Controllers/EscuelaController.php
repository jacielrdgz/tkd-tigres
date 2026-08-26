<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Escuela;
use App\Models\DireccionEscuela;
use Illuminate\Support\Facades\Storage;

class EscuelaController extends Controller
{
    private function getTenant()
    {
        $user = auth()->user();
        if (!$user || $user->isSuperAdmin()) return null;

        return $user->tenant;
    }

    public function show()
    {
        try {
            $tenant = $this->getTenant();
            if (!$tenant) {
                return response()->json(['message' => 'No tienes una escuela asignada.'], 403);
            }
            
            // Carga o crea la escuela asociada al tenant
            $escuela = Escuela::with('direccion')->firstOrCreate(
                ['tenant_id' => $tenant->id],
                [
                    'nombre' => $tenant->nombre ?: 'Mi Escuela',
                    'logo_url' => $tenant->logo,
                    'disciplina' => $tenant->disciplina ?? 'taekwondo'
                ]
            );

            // Sincronizar nombre y disciplina del tenant con los de la escuela si ya existen
            if (!empty($escuela->nombre) && $tenant->nombre !== $escuela->nombre) {
                $tenant->nombre = $escuela->nombre;
                $tenant->save();
            }
            if (!empty($escuela->disciplina) && $tenant->disciplina !== $escuela->disciplina) {
                $tenant->disciplina = $escuela->disciplina;
                $tenant->save();
            }

            $escuela->load('direccion');

            // Marcar como confirmado si ya contiene datos y el usuario visita la página
            if ($escuela->nombre && $escuela->titular) {
                $config = $tenant->configuracion ?? [];
                if (empty($config['setup_confirmado']['info_basica'])) {
                    $config['setup_confirmado']['info_basica'] = true;
                    $tenant->update(['configuracion' => $config]);
                }
            }

            // Logo base64: si ya es base64 lo usamos directamente, si no intentamos leerlo del storage
            $logoBase64 = null;
            if ($escuela->logo_url) {
                if (str_starts_with($escuela->logo_url, 'data:')) {
                    $logoBase64 = $escuela->logo_url;
                } else {
                    try {
                        if (Storage::disk('public')->exists($escuela->logo_url)) {
                            $path = Storage::disk('public')->path($escuela->logo_url);
                            if (file_exists($path)) {
                                $type = pathinfo($path, PATHINFO_EXTENSION);
                                $data = file_get_contents($path);
                                $logoBase64 = 'data:image/' . $type . ';base64,' . base64_encode($data);
                            }
                        }
                    } catch (\Throwable $ex) {
                        $logoBase64 = null;
                    }
                }
            }
            $escuela->logo_base64 = $logoBase64;

            return response()->json($escuela);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request)
    {
        try {
            $tenant = $this->getTenant();
            if (!$tenant) {
                return response()->json(['message' => 'No tienes una escuela asignada.'], 403);
            }
            $escuela = Escuela::firstOrCreate(
                ['tenant_id' => $tenant->id],
                [
                    'nombre' => $tenant->nombre ?: 'Mi Escuela',
                    'logo_url' => $tenant->logo,
                    'disciplina' => $tenant->disciplina ?? 'taekwondo'
                ]
            );

            $validated = $request->validate([
                'nombre'            => 'nullable|string|max:255',
                'titular'           => 'nullable|string|max:255',
                'disciplina'        => 'nullable|string|max:255',
                'eslogan'           => 'nullable|string|max:255',
                'descripcion'       => 'nullable|string',
                'telefono_contacto' => 'nullable|string|max:50',
                'email_contacto'    => 'nullable|email|max:255',
                'redes_sociales'    => 'nullable|array',
                'foto'              => 'nullable|image|mimes:jpeg,png,jpg,gif,webp,svg|max:10240',
                
                // Campos de dirección
                'calle'             => 'nullable|string|max:255',
                'numero_exterior'   => 'nullable|string|max:50',
                'numero_interior'   => 'nullable|string|max:50',
                'colonia'           => 'nullable|string|max:255',
                'ciudad'            => 'nullable|string|max:255',
                'estado'            => 'nullable|string|max:255',
                'codigo_postal'     => 'nullable|string|max:20',
                'referencias'       => 'nullable|string|max:255',
            ]);

            // Actualizar datos de la escuela
            $dataToUpdate = array_filter($request->only([
                'nombre', 'titular', 'disciplina', 'eslogan', 'descripcion', 
                'telefono_contacto', 'email_contacto', 'redes_sociales'
            ]), function ($val) { return $val !== null; });

            if (!empty($dataToUpdate)) {
                $escuela->update($dataToUpdate);
                
                // Sincronizar el nombre y disciplina en el tenant para la barra lateral y header
                $tenantUpdate = [];
                if (!empty($dataToUpdate['nombre'])) {
                    $tenantUpdate['nombre'] = $dataToUpdate['nombre'];
                }
                if (!empty($dataToUpdate['disciplina'])) {
                    $tenantUpdate['disciplina'] = $dataToUpdate['disciplina'];
                }
                if (!empty($tenantUpdate)) {
                    $tenant->update($tenantUpdate);
                }
            }

            // Manejar logo (almacenamiento en Base64 directo a Supabase)
            if ($request->hasFile('foto') && $request->file('foto')->isValid()) {
                try {
                    $file = $request->file('foto');
                    $mime = $file->getMimeType() ?: 'image/jpeg';
                    $base64 = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($file->getRealPath()));

                    $escuela->update(['logo_url' => $base64]);
                    $tenant->update(['logo' => $base64]);
                } catch (\Throwable $eFile) {
                    \Illuminate\Support\Facades\Log::error("Error guardando logo Base64: " . $eFile->getMessage());
                }
            }

            // Actualizar o crear dirección
            $escuela->direccion()->updateOrCreate(
                ['escuela_id' => $escuela->id],
                $request->only([
                    'calle', 'numero_exterior', 'numero_interior', 'colonia', 
                    'ciudad', 'estado', 'codigo_postal', 'referencias'
                ])
            );

            // Al guardar cambios, se confirma automáticamente la información básica
            $config = $tenant->configuracion ?? [];
            $config['setup_confirmado']['info_basica'] = true;
            $tenant->update(['configuracion' => $config]);

            return response()->json($escuela->load('direccion'));
        } catch (\Throwable $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => array_slice(array_map(function($t) {
                    return ($t['file'] ?? '?') . ':' . ($t['line'] ?? '?') . ' ' . ($t['class'] ?? '') . ($t['type'] ?? '') . ($t['function'] ?? '');
                }, $e->getTrace()), 0, 10),
            ], 500);
        }
    }

    /**
     * Retorna el estado de configuración de la escuela.
     */
    public function configStatus()
    {
        $tenant = $this->getTenant();
        if (!$tenant) {
            return response()->json([
                'configurado' => false,
                'pasos' => [
                    'info_basica' => false,
                    'cintas' => false,
                    'horarios' => false,
                ]
            ]);
        }

        $escuela = Escuela::where('tenant_id', $tenant->id)->first();
        
        $config = $tenant->configuracion ?? [];
        $infoConfirmada = isset($config['setup_confirmado']['info_basica']) && $config['setup_confirmado']['info_basica'];
        $cintasConfirmadas = isset($config['setup_confirmado']['cintas']) && $config['setup_confirmado']['cintas'];
        
        $infoCompleta = $escuela && $escuela->nombre && $escuela->titular && $infoConfirmada;
        
        $tieneCintas = \App\Models\ConfiguracionCinta::withoutGlobalScopes()->where('tenant_id', $tenant->id)->exists();
        $cintasCompleta = $tieneCintas && $cintasConfirmadas;
        
        $tieneHorarios = \App\Models\Horario::withoutGlobalScopes()->where('tenant_id', $tenant->id)->exists();

        $configurado = $infoCompleta && $cintasCompleta && $tieneHorarios;

        return response()->json([
            'configurado' => (bool) $configurado,
            'pasos' => [
                'info_basica' => (bool) $infoCompleta,
                'cintas' => (bool) $cintasCompleta,
                'horarios' => (bool) $tieneHorarios,
            ]
        ]);
    }

    /**
     * Confirma un paso preestablecido de configuración usando valores por defecto.
     */
    public function confirmarPaso(Request $request)
    {
        $request->validate([
            'paso' => 'required|in:info_basica,cintas'
        ]);

        $tenant = auth()->user()->tenant;
        if (!$tenant) {
            return response()->json(['message' => 'No tienes una escuela asignada.'], 403);
        }

        $paso = $request->paso;
        $config = $tenant->configuracion ?? [];

        if ($paso === 'info_basica') {
            $escuela = Escuela::firstOrCreate(
                ['tenant_id' => $tenant->id],
                [
                    'nombre' => $tenant->nombre,
                    'titular' => auth()->user()->name,
                    'disciplina' => 'taekwondo',
                    'email_contacto' => auth()->user()->email
                ]
            );

            if (empty($escuela->nombre)) {
                $escuela->nombre = $tenant->nombre;
            }
            if (empty($escuela->titular)) {
                $escuela->titular = auth()->user()->name;
            }
            if (empty($escuela->disciplina)) {
                $escuela->disciplina = 'taekwondo';
            }
            if (empty($escuela->email_contacto)) {
                $escuela->email_contacto = auth()->user()->email;
            }
            $escuela->save();
        } elseif ($paso === 'cintas') {
            $tieneCintas = \App\Models\ConfiguracionCinta::withoutGlobalScopes()->where('tenant_id', $tenant->id)->exists();
            if (!$tieneCintas) {
                \App\Services\DefaultCintasService::crearCintasPorDefecto($tenant->id);
            }
        }

        $config['setup_confirmado'][$paso] = true;
        $tenant->update(['configuracion' => $config]);

        return response()->json(['success' => true]);
    }
}
