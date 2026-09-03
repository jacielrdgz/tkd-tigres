<?php

namespace App\Services;

use App\Models\ConfiguracionCinta;

class DefaultCintasService
{
    /**
     * Definición estándar oficial de cintas de Taekwondo.
     */
    public static function getCintasDefecto(): array
    {
        return [
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
    }

    /**
     * Asegura que existan las 15 cintas globales maestras en la base de datos (tenant_id = NULL).
     */
    public static function asegurarCintasGlobales(): void
    {
        try {
            $cintas = self::getCintasDefecto();

            foreach ($cintas as $cinta) {
                ConfiguracionCinta::firstOrCreate(
                    ['tenant_id' => null, 'nombre_nivel' => $cinta['nombre_nivel']],
                    $cinta
                );
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('No se pudieron asegurar cintas globales: ' . $e->getMessage());
        }
    }

    /**
     * Clona el catálogo global para un tenant específico (Copy-on-Write).
     * Retorna un array asociativo [global_id => nuevo_tenant_id].
     */
    public static function materializarCintasParaTenant(int $tenantId): array
    {
        self::asegurarCintasGlobales();
        $globales = ConfiguracionCinta::globales()->get();
        $mapaIds = [];

        foreach ($globales as $global) {
            $clon = ConfiguracionCinta::create([
                'tenant_id'       => $tenantId,
                'nombre_nivel'    => $global->nombre_nivel,
                'color_hex'       => $global->color_hex,
                'color_texto'     => $global->color_texto,
                'orden'           => $global->orden,
                'categoria_label' => $global->categoria_label,
            ]);
            $mapaIds[$global->id] = $clon->id;
        }

        return $mapaIds;
    }

    /**
     * Compatibilidad: Las nuevas escuelas no crean filas, usan el catálogo global.
     */
    public static function crearCintasPorDefecto(int $tenantId): void
    {
        self::asegurarCintasGlobales();
    }
}
