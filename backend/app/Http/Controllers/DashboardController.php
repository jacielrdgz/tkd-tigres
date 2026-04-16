<?php

namespace App\Http\Controllers;

use App\Models\Alumno;
use App\Models\Pago;
use App\Models\Asistencia;
use App\Models\Evento;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        // Usamos la zona horaria local para que coincida con tu registro manual
        $hoy = Carbon::now('America/Chihuahua')->toDateString();

        return response()->json([
            // Contamos solo los que tienen el switch en 'activo'
            'alumnos_activos'    => Alumno::where('estatus', 'activo')->count(),
            
            'pagos_pendientes'   => Pago::where('estado', 'pendiente')->count(),
            'pagos_vencidos'     => Pago::where('estado', 'vencido')->count(),
            
            // FILTRO CORREGIDO:
            // 1. whereDate asegura que no importe si hay horas guardadas en la DB
            // 2. whereHas con filtro de estatus asegura que solo cuente a tus 41 alumnos actuales
            'asistencias_hoy'    => Asistencia::whereDate('fecha', $hoy)
                                            ->where('presente', true)
                                            ->whereHas('alumno', function($query) {
                                                $query->where('estatus', 'activo');
                                            })
                                            ->count(),
                                            
            'eventos_proximos'   => Evento::whereDate('fecha', '>=', $hoy)
                                            ->orderBy('fecha')
                                            ->take(5)
                                            ->get(),
        ]);
    }
}