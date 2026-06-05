<?php

namespace App\Services;

use App\Models\ConfiguracionCinta;

class DefaultCintasService
{
    /**
     * Crear las cintas por defecto de Taekwondo para un tenant.
     */
    public static function crearCintasPorDefecto(int $tenantId): void
    {
        $cintas = [
            ['nombre_nivel' => 'Blanca',           'color_hex' => '#e2e8f0', 'color_texto' => '#000000', 'orden' => 1],
            ['nombre_nivel' => 'Blanca Avanzada',   'color_hex' => '#cbd5e1', 'color_texto' => '#000000', 'orden' => 2],
            ['nombre_nivel' => 'Amarilla',          'color_hex' => '#ff9204', 'color_texto' => '#000000', 'orden' => 3],
            ['nombre_nivel' => 'Amarilla Avanzada', 'color_hex' => '#ff9204', 'color_texto' => '#000000', 'orden' => 4],
            ['nombre_nivel' => 'Naranja',           'color_hex' => '#fc770a', 'color_texto' => '#ffffff', 'orden' => 5],
            ['nombre_nivel' => 'Naranja Avanzada',  'color_hex' => '#fc770a', 'color_texto' => '#ffffff', 'orden' => 6],
            ['nombre_nivel' => 'Verde',             'color_hex' => '#015520', 'color_texto' => '#ffffff', 'orden' => 7],
            ['nombre_nivel' => 'Verde Avanzada',    'color_hex' => '#015520', 'color_texto' => '#ffffff', 'orden' => 8],
            ['nombre_nivel' => 'Azul',              'color_hex' => '#003575', 'color_texto' => '#ffffff', 'orden' => 9],
            ['nombre_nivel' => 'Azul Avanzada',     'color_hex' => '#003575', 'color_texto' => '#ffffff', 'orden' => 10],
            ['nombre_nivel' => 'Marrón',            'color_hex' => '#8b4513', 'color_texto' => '#ffffff', 'orden' => 11],
            ['nombre_nivel' => 'Marrón Avanzada',   'color_hex' => '#8b4513', 'color_texto' => '#ffffff', 'orden' => 12],
            ['nombre_nivel' => 'Roja',              'color_hex' => '#ff0000', 'color_texto' => '#ffffff', 'orden' => 13],
            ['nombre_nivel' => 'Roja Avanzada',     'color_hex' => '#ff0000', 'color_texto' => '#ffffff', 'orden' => 14],
            ['nombre_nivel' => 'Negra',             'color_hex' => '#1e293b', 'color_texto' => '#ffffff', 'orden' => 15],
        ];

        foreach ($cintas as $cinta) {
            ConfiguracionCinta::create(array_merge($cinta, [
                'tenant_id' => $tenantId,
                'categoria_label' => 'Cinta',
            ]));
        }
    }
}
