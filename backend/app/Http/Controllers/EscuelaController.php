<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Escuela;
use App\Models\DireccionEscuela;
use Illuminate\Support\Facades\Storage;

class EscuelaController extends Controller
{
    public function show()
    {
        $tenant = auth()->user()->tenant;
        if (!$tenant) {
            return response()->json(['message' => 'No tienes una escuela asignada aún. Contacta al administrador.'], 403);
        }
        
        // Carga o crea la escuela asociada al tenant
        $escuela = Escuela::with('direccion')->firstOrCreate(
            ['tenant_id' => $tenant->id],
            [
                'nombre' => $tenant->nombre,
                'logo_url' => $tenant->logo,
                'disciplina' => $tenant->disciplina ?? 'taekwondo'
            ]
        );

        $escuela->load('direccion');

        // Marcar como confirmado si ya contiene datos y el usuario visita la página
        if ($escuela->nombre && $escuela->titular) {
            $config = $tenant->configuracion ?? [];
            if (empty($config['setup_confirmado']['info_basica'])) {
                $config['setup_confirmado']['info_basica'] = true;
                $tenant->update(['configuracion' => $config]);
            }
        }

        // Adjuntar logo en base64 para evitar problemas de CORS en el PDF del frontend
        $logoBase64 = null;
        if ($escuela->logo_url && Storage::disk('public')->exists($escuela->logo_url)) {
            $path = Storage::disk('public')->path($escuela->logo_url);
            $type = pathinfo($path, PATHINFO_EXTENSION);
            $data = file_get_contents($path);
            $logoBase64 = 'data:image/' . $type . ';base64,' . base64_encode($data);
        }
        $escuela->logo_base64 = $logoBase64;

        return response()->json($escuela);
    }

    public function update(Request $request)
    {
        $tenant = auth()->user()->tenant;
        if (!$tenant) {
            return response()->json(['message' => 'No tienes una escuela asignada aún. Contacta al administrador.'], 403);
        }
        $escuela = Escuela::firstOrCreate(
            ['tenant_id' => $tenant->id],
            [
                'nombre' => $tenant->nombre,
                'logo_url' => $tenant->logo,
                'disciplina' => $tenant->disciplina ?? 'taekwondo'
            ]
        );

        $validated = $request->validate([
            'nombre'            => 'required|string|max:255',
            'titular'           => 'nullable|string|max:255',
            'disciplina'        => 'nullable|string|max:255',
            'eslogan'           => 'nullable|string|max:255',
            'descripcion'       => 'nullable|string',
            'telefono_contacto' => 'nullable|string|max:50',
            'email_contacto'    => 'nullable|email|max:255',
            'redes_sociales'    => 'nullable|array',
            'foto'              => 'nullable|image|max:2048',
            
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
        $escuela->update($request->only([
            'nombre', 'titular', 'disciplina', 'eslogan', 'descripcion', 
            'telefono_contacto', 'email_contacto', 'redes_sociales'
        ]));

        // Manejar logo
        if ($request->hasFile('foto')) {
            if ($escuela->logo_url) {
                Storage::disk('public')->delete($escuela->logo_url);
            }
            $path = $request->file('foto')->store('logos', 'public');
            $escuela->update(['logo_url' => $path]);
            
            // Opcional: sincronizar con el logo del tenant por ahora
            $tenant->update(['logo' => $path]);
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
    }

    /**
     * Retorna el estado de configuración de la escuela.
     */
    public function configStatus()
    {
        $tenant = auth()->user()->tenant;
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
