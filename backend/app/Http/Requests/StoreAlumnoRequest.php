<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAlumnoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = auth()->user()?->tenant_id;

        return [
            'nombre'           => ['required', 'string', 'max:100'],
            'apellido_paterno' => ['required', 'string', 'max:100'],
            'apellido_materno' => ['required', 'string', 'max:100'],
            'nombre_tutor'     => ['required', 'string', 'max:100'],
            'telefono_tutor'   => ['required', 'string', 'max:20', 'regex:/^[0-9+\s()-]+$/'],
            'email'            => [
                'nullable',
                'email:rfc,dns',
                'max:150',
            ],
            'fecha_nacimiento' => ['required', 'date', 'before:today'],
            'foto'             => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'configuracion_cinta_id' => ['nullable', 'integer', 'exists:configuraciones_cintas,id'],
            'estatus'          => ['sometimes', Rule::in(['activo', 'inactivo'])],
            'horario_id'       => ['nullable', 'integer', 'exists:horarios,id'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('telefono_tutor')) {
            $this->merge([
                'telefono_tutor' => trim((string) $this->input('telefono_tutor')),
            ]);
        }
        if ($this->has('email')) {
            $email = $this->input('email');
            $this->merge([
                'email' => $email === '' ? null : $email,
            ]);
        }
    }
}

