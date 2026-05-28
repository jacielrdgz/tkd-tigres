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
        Schema::table('tenants', function (Blueprint $table) {
            $table->enum('suscripcion_estado', ['activa', 'suspendida', 'trial', 'cancelada'])->default('trial')->after('plan');
            $table->date('suscripcion_hasta')->nullable()->after('suscripcion_estado');
            $table->decimal('suscripcion_monto', 8, 2)->default(0.00)->after('suscripcion_hasta');
            $table->boolean('is_suspended')->default(false)->after('suscripcion_monto');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['suscripcion_estado', 'suscripcion_hasta', 'suscripcion_monto', 'is_suspended']);
        });
    }
};
