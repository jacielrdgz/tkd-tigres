const MESES_NATURAL = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/**
 * Formatea una fecha ISO o string (YYYY-MM-DD) a lenguaje natural en español:
 * Ej: "2026-08-26" -> "26 de agosto de 2026"
 */
export function formatearFechaNatural(fechaStr) {
  if (!fechaStr) return 'Sin fecha registrada';
  try {
    const cleanStr = String(fechaStr).trim();
    // Extraer YYYY-MM-DD
    const datePart = cleanStr.split('T')[0].split(' ')[0];
    const partes = datePart.split('-');
    if (partes.length === 3) {
      const anio = partes[0];
      const mesIdx = parseInt(partes[1], 10) - 1;
      const dia = parseInt(partes[2], 10);
      const mesNombre = MESES_NATURAL[mesIdx] || partes[1];
      return `${dia} de ${mesNombre} de ${anio}`;
    }
    return cleanStr;
  } catch {
    return String(fechaStr);
  }
}

/**
 * Formatea un timestamp / datetime a fecha y hora local ajustada a la zona horaria del usuario.
 * Resuelve el desfase de horas cuando los timestamps vienen en UTC sin 'Z'.
 * Ej: "2026-08-26 18:18:00" -> "26 ago 2026, 12:18 p.m." (en GMT-6)
 */
export function formatearFechaHora(fechaStr) {
  if (!fechaStr) return 'Sin ingresos recientes';
  try {
    let cleanStr = String(fechaStr).trim();
    
    // Si viene como "YYYY-MM-DD HH:mm:ss", interpretarlo como UTC para ajustar a la zona horaria del navegador
    if (!cleanStr.includes('Z') && !cleanStr.includes('+') && !cleanStr.includes('-') && cleanStr.includes(' ')) {
      cleanStr = cleanStr.replace(' ', 'T') + 'Z';
    } else if (!cleanStr.includes('Z') && !cleanStr.includes('+') && cleanStr.includes('T')) {
      cleanStr = cleanStr + 'Z';
    }

    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) {
      // Fallback a parseo directo
      const fallbackDate = new Date(fechaStr);
      return isNaN(fallbackDate.getTime())
        ? String(fechaStr)
        : fallbackDate.toLocaleString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
    }

    return d.toLocaleString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(fechaStr);
  }
}
