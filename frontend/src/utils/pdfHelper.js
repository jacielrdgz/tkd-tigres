import api from '../api/axios'

/**
 * Obtiene la imagen del logo de la escuela convertida a formato Base64
 * compatible con jsPDF.
 * 
 * @param {string|null} logoSrc URL de Supabase, Base64 o ruta local
 * @returns {Promise<string|null>} Data URL en Base64 o null
 */
export async function getLogoBase64(logoSrc) {
  if (!logoSrc) return null

  // Si ya es un Base64 válido
  if (typeof logoSrc === 'string' && logoSrc.startsWith('data:image')) {
    return logoSrc
  }

  // Si es una URL completa (ej. Supabase Storage o CDN)
  if (typeof logoSrc === 'string' && (logoSrc.startsWith('http://') || logoSrc.startsWith('https://'))) {
    try {
      const resp = await fetch(logoSrc, { mode: 'cors' })
      if (!resp.ok) throw new Error('Error HTTP ' + resp.status)
      const blob = await resp.blob()
      return await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
    } catch (e) {
      console.warn('No se pudo convertir el logo remoto a Base64:', e)
    }
  }

  // Si es una ruta relativa local
  if (typeof logoSrc === 'string' && !logoSrc.startsWith('data:')) {
    try {
      const fullUrl = `${import.meta.env.VITE_API_URL || ''}/storage/${logoSrc}`
      const resp = await fetch(fullUrl)
      if (resp.ok) {
        const blob = await resp.blob()
        return await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => resolve(null)
          reader.readAsDataURL(blob)
        })
      }
    } catch (e) {
      // Ignorar fallback
    }
  }

  return null
}

/**
 * Carga los datos completos de la escuela y obtiene su logo en Base64 listo para PDF.
 */
export async function obtenerInfoEscuelaParaPDF(user = null) {
  let escuela = null
  try {
    const res = await api.get('/configuracion-escuela')
    escuela = res.data
  } catch (e) {
    console.warn('No se pudo obtener datos de la escuela para el PDF')
  }

  const nombre = escuela?.nombre || user?.tenant?.nombre || 'Mi Escuela'
  const logoRaw = escuela?.logo_url || escuela?.logo_base64 || user?.tenant?.logo || null
  const logoBase64 = await getLogoBase64(logoRaw)

  return {
    nombre,
    titular: escuela?.titular || '',
    disciplina: escuela?.disciplina || 'Taekwondo',
    telefono: escuela?.telefono_contacto || '',
    email: escuela?.email_contacto || '',
    direccion: escuela?.direccion || null,
    logoBase64
  }
}
