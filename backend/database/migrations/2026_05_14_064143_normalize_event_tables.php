<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        // 1. Añadir columna de relación directa en tablas hijas
        Schema::table('examen_alumno', function (Blueprint $table) {
            $table->unsignedBigInteger('evento_alumno_id')->nullable()->after('id');
        });

        Schema::table('torneo_alumno', function (Blueprint $table) {
            $table->unsignedBigInteger('evento_alumno_id')->nullable()->after('id');
        });

        // 2. Migrar datos existentes y llenar los NULLs de resultado en evento_alumno
        $pivots = DB::table('evento_alumno')->get();

        foreach ($pivots as $pivot) {
            // Actualizar examen_alumno
            DB::table('examen_alumno')
                ->where('evento_id', $pivot->evento_id)
                ->where('alumno_id', $pivot->alumno_id)
                ->update(['evento_alumno_id' => $pivot->id]);

            // Actualizar torneo_alumno
            DB::table('torneo_alumno')
                ->where('evento_id', $pivot->evento_id)
                ->where('alumno_id', $pivot->alumno_id)
                ->update(['evento_alumno_id' => $pivot->id]);

            // Obtener el resultado de cualquiera de las dos tablas de detalle
            $resExamen = DB::table('examen_alumno')->where('evento_id', $pivot->evento_id)->where('alumno_id', $pivot->alumno_id)->value('resultado');
            $resTorneo = DB::table('torneo_alumno')->where('evento_id', $pivot->evento_id)->where('alumno_id', $pivot->alumno_id)->value('resultado');

            $resultadoFinal = $resExamen ?: $resTorneo;

            if ($resultadoFinal && $resultadoFinal !== 'pendiente') {
                DB::table('evento_alumno')->where('id', $pivot->id)->update(['resultado' => $resultadoFinal]);
            }
        }
    }

    public function down()
    {
        Schema::table('examen_alumno', function (Blueprint $table) {
            $table->dropColumn('evento_alumno_id');
        });
        Schema::table('torneo_alumno', function (Blueprint $table) {
            $table->dropColumn('evento_alumno_id');
        });
    }
};
