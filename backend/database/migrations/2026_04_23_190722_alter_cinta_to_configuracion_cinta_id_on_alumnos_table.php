<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('alumnos', function (Blueprint $table) {
            $table->unsignedBigInteger('configuracion_cinta_id')->nullable()->after('foto');
            $table->foreign('configuracion_cinta_id')->references('id')->on('configuraciones_cintas')->onDelete('set null');
        });

        // Migración de datos: buscar cinta en texto y asignarla a configuracion_cinta_id
        $alumnos = DB::table('alumnos')->get();
        foreach ($alumnos as $alumno) {
            $cinta = $alumno->cinta ?? 'blanca';
            
            // Reemplazar espacios por guiones bajos si la base de datos lo tenía así (ej. 'blanca_avanzada')
            // O al reves, buscar el nombre tal cual. La UI de configuraciones_cintas permite nombrar libremente.
            $config = DB::table('configuraciones_cintas')
                ->where('nombre_nivel', $cinta)
                ->where('tenant_id', $alumno->tenant_id ?? 1)
                ->first();

            if ($config) {
                DB::table('alumnos')
                    ->where('id', $alumno->id)
                    ->update(['configuracion_cinta_id' => $config->id]);
            }
        }

        Schema::table('alumnos', function (Blueprint $table) {
            $table->dropColumn('cinta');
        });
    }

    public function down(): void
    {
        Schema::table('alumnos', function (Blueprint $table) {
            $table->string('cinta')->default('blanca')->after('foto');
        });

        // Intento de regresar de ID a string (rudimentario)
        $alumnos = DB::table('alumnos')->get();
        foreach ($alumnos as $alumno) {
            if ($alumno->configuracion_cinta_id) {
                $config = DB::table('configuraciones_cintas')->where('id', $alumno->configuracion_cinta_id)->first();
                if ($config) {
                    DB::table('alumnos')
                        ->where('id', $alumno->id)
                        ->update(['cinta' => $config->nombre_nivel]);
                }
            }
        }

        Schema::table('alumnos', function (Blueprint $table) {
            $table->dropForeign(['configuracion_cinta_id']);
            $table->dropColumn('configuracion_cinta_id');
        });
    }
};
