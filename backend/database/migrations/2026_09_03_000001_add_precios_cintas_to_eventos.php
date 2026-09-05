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
        Schema::table('eventos', function (Blueprint $table) {
            if (!Schema::hasColumn('eventos', 'precios_cintas')) {
                $table->json('precios_cintas')->nullable();
            }
            if (!Schema::hasColumn('eventos', 'lugar')) {
                $table->string('lugar', 200)->nullable();
            }
            if (!Schema::hasColumn('eventos', 'costo')) {
                $table->decimal('costo', 10, 2)->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('eventos', function (Blueprint $table) {
            $table->dropColumn('precios_cintas');
        });
    }
};
