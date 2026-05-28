<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Alumno;
use App\Models\Pago;
use App\Models\SuscripcionHistorial;

class AdminAcademiaController extends Controller
{
    /**
     * Listado de todas las academias.
     */
    public function index()
    {
        $tenants = Tenant::with('escuela')->get()->map(function ($tenant) {
            // Obtener el dueño
            $owner = User::where('tenant_id', $tenant->id)
                ->where('role', 'owner')
                ->first();

            // Total alumnos
            $totalAlumnos = Alumno::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->count();

            // Último acceso de cualquier usuario de la academia
            $ultimoAcceso = User::where('tenant_id', $tenant->id)
                ->max('last_login_at');

            // Nombre real configurado de la escuela
            $nombreEscuela = ($tenant->escuela && $tenant->escuela->nombre) ? $tenant->escuela->nombre : $tenant->nombre;

            return [
                'id'                  => $tenant->id,
                'nombre'              => $nombreEscuela,
                'slug'                => $tenant->slug,
                'fecha_registro'      => $tenant->created_at->toDateString(),
                'suscripcion_estado'  => $tenant->suscripcion_estado,
                'suscripcion_hasta'   => $tenant->suscripcion_hasta ? $tenant->suscripcion_hasta->toDateString() : null,
                'plan'                => $tenant->plan,
                'is_suspended'        => $tenant->is_suspended,
                'owner_name'          => $owner ? $owner->name : 'N/A',
                'owner_email'         => $owner ? $owner->email : 'N/A',
                'alumnos_registrados' => $totalAlumnos,
                'ultimo_acceso'       => $ultimoAcceso,
            ];
        });

        return response()->json($tenants);
    }

    /**
     * Detalle de una academia.
     */
    public function show($id)
    {
        $tenant = Tenant::findOrFail($id);

        $owner = User::where('tenant_id', $tenant->id)
            ->where('role', 'owner')
            ->first();

        $totalAlumnos = Alumno::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->count();

        $totalPagos = Pago::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->count();

        $ultimoAcceso = User::where('tenant_id', $tenant->id)
            ->max('last_login_at');

        $historial = SuscripcionHistorial::where('tenant_id', $tenant->id)
            ->orderBy('fecha_pago', 'desc')
            ->get();

        // Obtener el perfil escolar y dirección actualizada
        $escuela = $tenant->escuela()->with('direccion')->first();
        
        $nombreEscuela = ($escuela && $escuela->nombre) ? $escuela->nombre : $tenant->nombre;
        
        $direccionString = '';
        $ciudad = null;
        $estado = null;
        if ($escuela && $escuela->direccion) {
            $dir = $escuela->direccion;
            $parts = array_filter([
                $dir->calle ? $dir->calle . ($dir->numero_exterior ? ' #' . $dir->numero_exterior : '') : null,
                $dir->colonia ? 'Col. ' . $dir->colonia : null,
                $dir->codigo_postal ? 'C.P. ' . $dir->codigo_postal : null,
            ]);
            $direccionString = implode(', ', $parts);
            $ciudad = $dir->ciudad;
            $estado = $dir->estado;
        }
        
        if (empty($direccionString)) {
            $direccionString = $tenant->direccion;
        }

        $telefono = ($escuela && $escuela->telefono_contacto) ? $escuela->telefono_contacto : $tenant->telefono;
        $disciplina = ($escuela && $escuela->disciplina) ? $escuela->disciplina : $tenant->disciplina;

        return response()->json([
            'academia' => [
                'id'                 => $tenant->id,
                'nombre'             => $nombreEscuela,
                'slug'               => $tenant->slug,
                'direccion'          => $direccionString,
                'ciudad'             => $ciudad,
                'estado'             => $estado,
                'telefono'           => $telefono,
                'disciplina'         => $disciplina,
                'suscripcion_estado' => $tenant->suscripcion_estado,
                'suscripcion_hasta'  => $tenant->suscripcion_hasta ? $tenant->suscripcion_hasta->toDateString() : null,
                'suscripcion_monto'  => (float)$tenant->suscripcion_monto,
                'plan'               => $tenant->plan,
                'is_suspended'       => $tenant->is_suspended,
                'created_at'         => $tenant->created_at->toDateString(),
            ],
            'owner' => $owner ? [
                'name'  => $owner->name,
                'email' => $owner->email,
            ] : null,
            'stats' => [
                'total_alumnos'          => $totalAlumnos,
                'total_pagos_registrados' => $totalPagos,
                'ultimo_acceso'          => $ultimoAcceso,
            ],
            'historial_suscripciones' => $historial
        ]);
    }

    /**
     * Suspender una academia.
     */
    public function suspender($id)
    {
        $tenant = Tenant::findOrFail($id);
        $tenant->is_suspended = true;
        $tenant->suscripcion_estado = 'suspendida';
        $tenant->save();

        return response()->json(['message' => 'Academia suspendida con éxito.']);
    }

    /**
     * Activar una academia suspendida.
     */
    public function activar($id)
    {
        $tenant = Tenant::findOrFail($id);
        $tenant->is_suspended = false;
        
        // Si estaba vencida, la regresamos a activa/vencida
        if ($tenant->suscripcion_hasta && $tenant->suscripcion_hasta->isPast()) {
            $tenant->suscripcion_estado = 'cancelada';
        } else {
            $tenant->suscripcion_estado = 'activa';
        }
        $tenant->save();

        return response()->json(['message' => 'Academia reactivada con éxito.']);
    }

    /**
     * Eliminar academia.
     */
    public function destroy($id)
    {
        $tenant = Tenant::findOrFail($id);
        $tenant->delete();

        return response()->json(['message' => 'Academia eliminada permanentemente.']);
    }
}
