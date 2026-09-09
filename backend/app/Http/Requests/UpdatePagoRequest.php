<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePagoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tipo'         => ['sometimes', 'in:mensualidad,inscripcion'],
            'fecha_inicio' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'fecha_fin'    => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'monto'        => ['sometimes', 'numeric', 'min:0.01', 'max:999999.99'],
            'metodo_pago'  => ['sometimes', 'in:efectivo,transferencia,tarjeta'],
            'estado'       => ['sometimes', 'in:pagado,pendiente,vencido'],
            'fecha_pago'   => ['nullable', 'date_format:Y-m-d'],
        ];
    }
}
