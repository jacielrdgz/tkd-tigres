<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Tenant;
use App\Models\User;
use App\Mail\SuscripcionVencerMail;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class EnviarAlertasVencimiento extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'suscripcion:alertar-vencidos';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Envía alertas por correo electrónico a las academias cuya suscripción venza en exactamente 7 días.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $fechaObjetivo = Carbon::now()->addDays(7)->toDateString();

        $tenants = Tenant::where('suscripcion_estado', '!=', 'suspendida')
            ->whereDate('suscripcion_hasta', $fechaObjetivo)
            ->get();

        $this->info("Buscando escuelas que vencen el {$fechaObjetivo}. Se encontraron " . $tenants->count() . " escuelas.");

        foreach ($tenants as $tenant) {
            // Obtener el usuario administrador (owner) de la escuela
            $owner = User::where('tenant_id', $tenant->id)
                ->where('role', 'owner')
                ->where('is_suspended', false)
                ->first();

            if ($owner) {
                try {
                    Mail::to($owner->email)->send(new SuscripcionVencerMail($owner->name, $tenant->nombre, $tenant->suscripcion_hasta));
                    $this->info("Alerta de vencimiento enviada a: {$owner->email} para la escuela: {$tenant->nombre}");
                } catch (\Exception $e) {
                    \Log::error("Error al enviar alerta de vencimiento a {$owner->email}: " . $e->getMessage());
                    $this->error("Error al enviar a {$owner->email}: " . $e->getMessage());
                }
            }
        }

        $this->info('Comando de alertas ejecutado con éxito.');
    }
}
