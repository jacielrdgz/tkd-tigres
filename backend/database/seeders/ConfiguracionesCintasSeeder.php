<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ConfiguracionesCintasSeeder extends Seeder
{
    public function run(): void
    {
        $cintas = [
            ['nombre_nivel' => 'Blanca',           'color_hex' => '#e2e8f0', 'orden' => 1],
            ['nombre_nivel' => 'Blanca Avanzada',   'color_hex' => '#cbd5e1', 'orden' => 2],
            ['nombre_nivel' => 'Amarilla',          'color_hex' => '#ff9204', 'orden' => 3],
            ['nombre_nivel' => 'Amarilla Avanzada', 'color_hex' => '#ff9204', 'orden' => 4],
            ['nombre_nivel' => 'Naranja',           'color_hex' => '#fc770a', 'orden' => 5],
            ['nombre_nivel' => 'Naranja Avanzada',  'color_hex' => '#fc770a', 'orden' => 6],
            ['nombre_nivel' => 'Verde',             'color_hex' => '#015520', 'orden' => 7],
            ['nombre_nivel' => 'Verde Avanzada',    'color_hex' => '#015520', 'orden' => 8],
            ['nombre_nivel' => 'Azul',              'color_hex' => '#003575', 'orden' => 9],
            ['nombre_nivel' => 'Azul Avanzada',     'color_hex' => '#003575', 'orden' => 10],
            ['nombre_nivel' => 'Marrón',            'color_hex' => '#8b4513', 'orden' => 11],
            ['nombre_nivel' => 'Marrón Avanzada',   'color_hex' => '#8b4513', 'orden' => 12],
            ['nombre_nivel' => 'Roja',              'color_hex' => '#ff0000', 'orden' => 13],
            ['nombre_nivel' => 'Roja Avanzada',     'color_hex' => '#ff0000', 'orden' => 14],
            ['nombre_nivel' => 'Negra',             'color_hex' => '#1e293b', 'orden' => 15],
        ];

        foreach ($cintas as $cinta) {
            DB::table('configuraciones_cintas')->insert([
                'tenant_id'       => 1,
                'nombre_nivel'    => $cinta['nombre_nivel'],
                'color_hex'       => $cinta['color_hex'],
                'orden'           => $cinta['orden'],
                'categoria_label' => 'Cinta',
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        }
    }
}