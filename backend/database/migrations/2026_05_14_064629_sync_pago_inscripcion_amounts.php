<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        // 1. Cambiar el tipo de columna pago_inscripcion a decimal para soportar montos (solo si no es pgsql)
        if (DB::getDriverName() !== 'pgsql') {
            Schema::table('evento_alumno', function (Blueprint $table) {
                $table->decimal('pago_inscripcion', 10, 2)->default(0)->change();
            });
        }

        // 2. Sincronizar montos desde las tablas de detalle
        $pivots = DB::table('evento_alumno')->get();

        foreach ($pivots as $pivot) {
            // Intentar obtener de examen
            $costo = DB::table('examen_alumno')
                ->where('evento_id', $pivot->evento_id)
                ->where('alumno_id', $pivot->alumno_id)
                ->value('costo_examen');

            if (!$costo) {
                // Intentar obtener de torneo
                $costo = DB::table('torneo_alumno')
                    ->where('evento_id', $pivot->evento_id)
                    ->where('alumno_id', $pivot->alumno_id)
                    ->value('costo_torneo');
            }

            if ($costo) {
                DB::table('evento_alumno')
                    ->where('id', $pivot->id)
                    ->update(['pago_inscripcion' => $costo]);
            }
        }
    }

    public function down()
    {
        Schema::table('evento_alumno', function (Blueprint $table) {
            $table->tinyint('pago_inscripcion')->default(0)->change();
        });
    }
};
