<?php

namespace App\Http\Requests;

use App\Models\Alumno;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAlumnoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var Alumno|null $alumno */
        $alumno = $this->route('alumno');
        $tenantId = auth()->user()?->tenant_id;

        return [
            'nombre'           => ['sometimes', 'string', 'max:100'],
            'apellido_paterno' => ['sometimes', 'string', 'max:100'],
            'apellido_materno' => ['sometimes', 'string', 'max:100'],
            'nombre_tutor'     => ['sometimes', 'string', 'max:100'],
            'telefono_tutor'   => ['sometimes', 'string', 'max:20', 'regex:/^[0-9+\s()-]+$/'],
            'email'            => [
                'nullable',
                'email:rfc,dns',
                'max:150',
            ],
            'fecha_nacimiento' => ['sometimes', 'date', 'before:today'],
            'foto'             => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'configuracion_cinta_id' => ['sometimes', 'nullable', 'integer', 'exists:configuraciones_cintas,id'],
            'estatus'          => ['sometimes', Rule::in(['activo', 'inactivo'])],
            'horario'          => ['sometimes', 'nullable', 'string', 'max:50'],
            'eliminar_foto'    => ['sometimes', Rule::in(['0', '1', 0, 1, true, false])],
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
        if ($this->has('eliminar_foto')) {
            $val = $this->input('eliminar_foto');
            $this->merge([
                'eliminar_foto' => ($val === true || $val === 1 || $val === '1') ? '1' : '0',
            ]);
        }
    }
}

