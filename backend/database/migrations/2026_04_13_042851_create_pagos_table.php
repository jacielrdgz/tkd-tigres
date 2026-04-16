<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pagos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('alumno_id')->constrained('alumnos')->onDelete('cascade');
            $table->string('mes', 7);
            $table->decimal('monto', 8, 2);
            $table->enum('metodo_pago', ['efectivo', 'transferencia', 'tarjeta']);
            $table->enum('estado', ['pagado', 'pendiente', 'vencido'])->default('pendiente');
            $table->date('fecha_pago')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pagos');
    }
};