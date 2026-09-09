<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePagoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'alumno_id'    => ['required', 'integer', 'exists:alumnos,id'],
            'tipo'         => ['nullable', 'in:mensualidad,inscripcion'],
            'fecha_inicio' => ['nullable', 'required_if:tipo,mensualidad', 'date_format:Y-m-d'],
            'fecha_fin'    => ['nullable', 'required_if:tipo,mensualidad', 'date_format:Y-m-d', 'after:fecha_inicio'],
            'monto'        => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'metodo_pago'  => ['required', 'in:efectivo,transferencia,tarjeta'],
            'estado'       => ['required', 'in:pagado,pendiente,vencido'],
            'fecha_pago'   => ['nullable', 'date_format:Y-m-d'],
        ];
    }
}
