<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Modificar columna tenant_id para que sea nullable
        Schema::table('configuraciones_cintas', function (Blueprint $table) {
            $table->unsignedBigInteger('tenant_id')->nullable()->change();
        });

        // 2. Definición de las 15 cintas globales oficiales
        $cintasGlobales = [
            ['nombre_nivel' => 'Blanca',           'color_hex' => '#e2e8f0', 'color_texto' => '#000000', 'orden' => 1,  'categoria_label' => 'Cinta'],
            ['nombre_nivel' => 'Blanca Avanzada',   'color_hex' => '#cbd5e1', 'color_texto' => '#000000', 'orden' => 2,  'categoria_label' => 'Cinta'],
            ['nombre_nivel' => 'Amarilla',          'color_hex' => '#ff9204', 'color_texto' => '#000000', 'orden' => 3,  'categoria_label' => 'Cinta'],
            ['nombre_nivel' => 'Amarilla Avanzada', 'color_hex' => '#ff9204', 'color_texto' => '#000000', 'orden' => 4,  'categoria_label' => 'Cinta'],
            ['nombre_nivel' => 'Naranja',           'color_hex' => '#fc770a', 'color_texto' => '#ffffff', 'orden' => 5,  'categoria_label' => 'Cinta'],
            ['nombre_nivel' => 'Naranja Avanzada',  'color_hex' => '#fc770a', 'color_texto' => '#ffffff', 'orden' => 6,  'categoria_label' => 'Cinta'],
            ['nombre_nivel' => 'Verde',             'color_hex' => '#015520', 'color_texto' => '#ffffff', 'orden' => 7,  'categoria_label' => 'Cinta'],
            ['nombre_nivel' => 'Verde Avanzada',    'color_hex' => '#015520', 'color_texto' => '#ffffff', 'orden' => 8,  'categoria_label' => 'Cinta'],
            ['nombre_nivel' => 'Azul',              'color_hex' => '#003575', 'color_texto' => '#ffffff', 'orden' => 9,  'categoria_label' => 'Cinta'],
            ['nombre_nivel' => 'Azul Avanzada',     'color_hex' => '#003575', 'color_texto' => '#ffffff', 'orden' => 10, 'categoria_label' => 'Cinta'],
            ['nombre_nivel' => 'Marrón',            'color_hex' => '#8b4513', 'color_texto' => '#ffffff', 'orden' => 11, 'categoria_label' => 'Cinta'],
            ['nombre_nivel' => 'Marrón Avanzada',   'color_hex' => '#8b4513', 'color_texto' => '#ffffff', 'orden' => 12, 'categoria_label' => 'Cinta'],
            ['nombre_nivel' => 'Roja',              'color_hex' => '#ff0000', 'color_texto' => '#ffffff', 'orden' => 13, 'categoria_label' => 'Cinta'],
            ['nombre_nivel' => 'Roja Avanzada',     'color_hex' => '#ff0000', 'color_texto' => '#ffffff', 'orden' => 14, 'categoria_label' => 'Cinta'],
            ['nombre_nivel' => 'Negra',             'color_hex' => '#1e293b', 'color_texto' => '#ffffff', 'orden' => 15, 'categoria_label' => 'Cinta'],
        ];

        // 3. Insertar cintas globales con tenant_id = NULL si no existen
        $globalMap = []; // nombre_nivel => global_id
        foreach ($cintasGlobales as $cinta) {
            $existente = DB::table('configuraciones_cintas')
                ->whereNull('tenant_id')
                ->where('nombre_nivel', $cinta['nombre_nivel'])
                ->first();

            if (!$existente) {
                $id = DB::table('configuraciones_cintas')->insertGetId(array_merge($cinta, [
                    'tenant_id'  => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
                $globalMap[$cinta['nombre_nivel']] = $id;
            } else {
                $globalMap[$cinta['nombre_nivel']] = $existente->id;
            }
        }

        // 4. Limpiar duplicados de escuelas que tengan exactamente las cintas por defecto
        // y reasignar a los alumnos para que apunten a los IDs de las cintas globales
        $cintasPorTenant = DB::table('configuraciones_cintas')
            ->whereNotNull('tenant_id')
            ->get();

        foreach ($cintasPorTenant as $cintaTenant) {
            if (isset($globalMap[$cintaTenant->nombre_nivel])) {
                $globalId = $globalMap[$cintaTenant->nombre_nivel];

                // Actualizar alumnos que apuntaban al ID del tenant
                if (Schema::hasTable('alumnos') && Schema::hasColumn('alumnos', 'configuracion_cinta_id')) {
                    DB::table('alumnos')
                        ->where('configuracion_cinta_id', $cintaTenant->id)
                        ->update(['configuracion_cinta_id' => $globalId]);
                }

                // Actualizar instructores
                if (Schema::hasTable('instructores') && Schema::hasColumn('instructores', 'configuracion_cinta_id')) {
                    DB::table('instructores')
                        ->where('configuracion_cinta_id', $cintaTenant->id)
                        ->update(['configuracion_cinta_id' => $globalId]);
                }

                // Actualizar examenes
                if (Schema::hasTable('examenes_alumnos')) {
                    if (Schema::hasColumn('examenes_alumnos', 'grado_actual_id')) {
                        DB::table('examenes_alumnos')
                            ->where('grado_actual_id', $cintaTenant->id)
                            ->update(['grado_actual_id' => $globalId]);
                    }
                    if (Schema::hasColumn('examenes_alumnos', 'grado_siguiente_id')) {
                        DB::table('examenes_alumnos')
                            ->where('grado_siguiente_id', $cintaTenant->id)
                            ->update(['grado_siguiente_id' => $globalId]);
                    }
                }

                // Actualizar historial de grados
                if (Schema::hasTable('historial_grados')) {
                    if (Schema::hasColumn('historial_grados', 'grado_anterior_id')) {
                        DB::table('historial_grados')
                            ->where('grado_anterior_id', $cintaTenant->id)
                            ->update(['grado_anterior_id' => $globalId]);
                    }
                    if (Schema::hasColumn('historial_grados', 'grado_nuevo_id')) {
                        DB::table('historial_grados')
                            ->where('grado_nuevo_id', $cintaTenant->id)
                            ->update(['grado_nuevo_id' => $globalId]);
                    }
                }
            }
        }

        // Eliminar las filas de tenant duplicadas para limpiar la tabla
        DB::table('configuraciones_cintas')
            ->whereNotNull('tenant_id')
            ->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('configuraciones_cintas', function (Blueprint $table) {
            $table->unsignedBigInteger('tenant_id')->nullable(false)->change();
        });
    }
};
