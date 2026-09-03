<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\SupabaseStorageService;

class ConfiguracionEscuelaController extends Controller
{
    public function show()
    {
        $tenant = auth()->user()->tenant;
        return response()->json($tenant);
    }

    public function update(Request $request)
    {
        $tenant = auth()->user()->tenant;

        $request->validate([
            'nombre'    => 'nullable|string|max:255',
            'direccion' => 'nullable|string|max:255',
            'telefono'  => 'nullable|string|max:255',
            'foto'      => 'nullable|image|mimes:jpeg,png,jpg,gif,webp,svg|max:10240',
        ]);

        if ($request->filled('nombre')) {
            $tenant->nombre = $request->nombre;
        }
        $tenant->direccion = $request->direccion;
        $tenant->telefono = $request->telefono;

        if ($request->hasFile('foto') && $request->file('foto')->isValid()) {
            // Borrar logo anterior si existe
            if ($tenant->logo) {
                SupabaseStorageService::delete($tenant->logo);
            }
            // Guardar nuevo logo en carpeta logos de la escuela
            $path = SupabaseStorageService::upload($request->file('foto'), 'logos');
            $tenant->logo = $path;
        }

        $tenant->save();

        return response()->json($tenant);
    }
}
