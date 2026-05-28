<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('global_configs', function (Blueprint $table) {
            $table->id();
            $table->decimal('precio_plan_mensual', 8, 2)->default(500.00);
            $table->integer('dias_trial')->default(30);
            $table->text('correo_bienvenida_texto')->nullable();
            $table->text('correo_rechazo_texto')->nullable();
            $table->boolean('modo_mantenimiento')->default(false);
            $table->text('modo_mantenimiento_mensaje')->nullable();
            $table->timestamps();
        });

        // Seed default config
        \DB::table('global_configs')->insert([
            'precio_plan_mensual' => 500.00,
            'dias_trial' => 30,
            'correo_bienvenida_texto' => 'Tu academia ha sido aprobada, ya puedes iniciar sesión',
            'correo_rechazo_texto' => 'Tu solicitud fue rechazada',
            'modo_mantenimiento' => false,
            'modo_mantenimiento_mensaje' => 'El sistema se encuentra en mantenimiento programado. Volveremos pronto.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('global_configs');
    }
};
