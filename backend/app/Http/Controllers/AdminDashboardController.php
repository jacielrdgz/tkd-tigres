<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Alumno;
use App\Models\SuscripcionHistorial;
use Carbon\Carbon;

class AdminDashboardController extends Controller
{
    public function index()
    {
        $hoy = Carbon::now();
        $fin7Dias = Carbon::now()->addDays(7);

        // 1. Total academias activas
        $academiasActivas = Tenant::where('is_suspended', false)
            ->whereIn('suscripcion_estado', ['activa', 'trial'])
            ->count();

        // 2. Total alumnos en todo el sistema
        $totalAlumnos = Alumno::withoutGlobalScopes()->count();

        // 3. Ingresos del mes actual (según historial de renovaciones de suscripción)
        $ingresosMes = SuscripcionHistorial::whereMonth('fecha_pago', $hoy->month)
            ->whereYear('fecha_pago', $hoy->year)
            ->sum('monto');

        // 4. Academias por vencer en los próximos 7 días
        $academiasPorVencer = Tenant::where('is_suspended', false)
            ->whereBetween('suscripcion_hasta', [$hoy->toDateString(), $fin7Dias->toDateString()])
            ->count();

        // 5. Solicitudes pendientes de aprobación
        $solicitudesPendientes = User::withoutGlobalScopes()
            ->whereNull('tenant_id')
            ->where('is_superadmin', false)
            ->count();

        // 6. Nuevas academias este mes
        $nuevasAcademiasEsteMes = Tenant::whereMonth('created_at', $hoy->month)
            ->whereYear('created_at', $hoy->year)
            ->count();

        return response()->json([
            'academias_activas' => $academiasActivas,
            'total_alumnos' => $totalAlumnos,
            'ingresos_mes' => (float)$ingresosMes,
            'academias_por_vencer' => $academiasPorVencer,
            'solicitudes_pendientes' => $solicitudesPendientes,
            'nuevas_academias_este_mes' => $nuevasAcademiasEsteMes,
        ]);
    }
}
