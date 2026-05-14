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
        
        // Carga o crea la escuela asociada al tenant
        $escuela = Escuela::with('direccion')->firstOrCreate(
            ['tenant_id' => $tenant->id],
            [
                'nombre' => $tenant->nombre,
                'logo_url' => $tenant->logo,
                'disciplina' => $tenant->disciplina ?? 'taekwondo'
            ]
        );

        return response()->json($escuela);
    }

    public function update(Request $request)
    {
        $tenant = auth()->user()->tenant;
        $escuela = $tenant->escuela()->firstOrCreate(['tenant_id' => $tenant->id]);

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

        return response()->json($escuela->load('direccion'));
    }
}
