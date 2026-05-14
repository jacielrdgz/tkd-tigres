<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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
            'nombre'    => 'required|string|max:255',
            'direccion' => 'nullable|string|max:255',
            'telefono'  => 'nullable|string|max:255',
            'foto'      => 'nullable|image|max:2048',
        ]);

        $tenant->nombre = $request->nombre;
        $tenant->direccion = $request->direccion;
        $tenant->telefono = $request->telefono;

        if ($request->hasFile('foto')) {
            // Borrar logo anterior si existe
            if ($tenant->logo) {
                Storage::disk('public')->delete($tenant->logo);
            }
            // Guardar nuevo logo
            $path = $request->file('foto')->store('logos', 'public');
            $tenant->logo = $path;
        }

        $tenant->save();

        return response()->json($tenant);
    }
}
