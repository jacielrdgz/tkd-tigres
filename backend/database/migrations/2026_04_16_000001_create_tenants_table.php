<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');                          // "Tigres Do"
            $table->string('slug')->unique();                  // "tigres-do"
            $table->string('logo')->nullable();                // path a logo
            $table->string('disciplina')->default('taekwondo');// TKD, Karate, BJJ...
            $table->json('configuracion')->nullable();         // colores, horarios, montos default
            $table->enum('plan', ['free', 'pro', 'enterprise'])->default('free');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
