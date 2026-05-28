<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\GlobalConfig;

class AdminConfiguracionController extends Controller
{
    /**
     * Obtener la configuración global del sistema.
     */
    public function show()
    {
        $config = GlobalConfig::first();
        if (!$config) {
            $config = GlobalConfig::create([
                'precio_plan_mensual' => 500.00,
                'dias_trial'          => 30,
                'correo_bienvenida_texto' => 'Tu academia ha sido aprobada, ya puedes iniciar sesión',
                'correo_rechazo_texto' => 'Tu solicitud fue rechazada',
                'modo_mantenimiento'  => false,
                'modo_mantenimiento_mensaje' => 'El sistema se encuentra en mantenimiento programado. Volveremos pronto.',
            ]);
        }
        return response()->json($config);
    }

    /**
     * Actualizar la configuración global.
     */
    public function update(Request $request)
    {
        $request->validate([
            'precio_plan_mensual'        => 'required|numeric|min:0',
            'dias_trial'                 => 'required|integer|min:0',
            'correo_bienvenida_texto'    => 'nullable|string',
            'correo_rechazo_texto'       => 'nullable|string',
            'modo_mantenimiento'         => 'required|boolean',
            'modo_mantenimiento_mensaje' => 'nullable|string|max:1000',
        ]);

        $config = GlobalConfig::first();
        if (!$config) {
            $config = new GlobalConfig();
        }

        $config->precio_plan_mensual = $request->precio_plan_mensual;
        $config->dias_trial = $request->dias_trial;
        $config->correo_bienvenida_texto = $request->correo_bienvenida_texto;
        $config->correo_rechazo_texto = $request->correo_rechazo_texto;
        $config->modo_mantenimiento = $request->modo_mantenimiento;
        $config->modo_mantenimiento_mensaje = $request->modo_mantenimiento_mensaje;
        $config->save();

        return response()->json([
            'message' => 'Configuración actualizada exitosamente.',
            'config'  => $config
        ]);
    }
}
