import api from '../api/axios'
import { getCache, setCache } from './cacheManager'

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

/**
 * Convierte cualquier logo (URL de Supabase, ruta relativa o Base64)
 * a un Data URL Base64 listo para jsPDF.
 */
export async function getLogoBase64(logoSrc) {
  if (!logoSrc) return null

  // Si ya es Base64
  if (typeof logoSrc === 'string' && logoSrc.startsWith('data:image')) {
    return logoSrc
  }

  // Si es URL remota (ej. Supabase Storage o CDN)
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

  // Si es ruta relativa local
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
 * Obtiene la información oficial de la escuela desde la API de ajustes.
 */
export async function obtenerInfoEscuelaParaPDF(user = null) {
  let escuela = null
  const cached = getCache('configuracion_escuela')
  if (cached && cached.data) {
    escuela = cached.data
  } else {
    try {
      const res = await api.get('/configuracion-escuela')
      escuela = res.data
      setCache('configuracion_escuela', res.data)
    } catch (e) {
      console.warn('No se pudo obtener datos de la escuela para el PDF')
    }
  }

  const nombre = escuela?.nombre || user?.tenant?.nombre || 'MI ESCUELA'
  const logoRaw = escuela?.logo_url || escuela?.logo_base64 || user?.tenant?.logo || null
  const logoBase64 = await getLogoBase64(logoRaw)

  return {
    nombre,
    titular: escuela?.titular || '',
    disciplina: escuela?.disciplina || 'Taekwondo',
    telefono: escuela?.telefono_contacto || '',
    email: escuela?.email_contacto || '',
    direccion: escuela?.direccion || null,
    eslogan: escuela?.eslogan || '',
    logoBase64
  }
}

/**
 * Convierte un formato YYYY-MM (ej. 2026-08) a "AGOSTO DE 2026".
 */
export function formatearPeriodoOMes(valor) {
  if (!valor) return ''
  const str = String(valor).trim()
  const match = str.match(/^(\d{4})-(\d{1,2})$/)
  if (match) {
    const anio = match[1]
    const mesIdx = parseInt(match[2], 10) - 1
    if (mesIdx >= 0 && mesIdx < 12) {
      return `${NOMBRES_MESES[mesIdx].toUpperCase()} DE ${anio}`
    }
  }
  return str.toUpperCase()
}

/**
 * Convierte una fecha YYYY-MM-DD a formato natural: "11 de Mayo de 2026".
 */
export function formatearFechaNaturalPDF(fecha) {
  if (!fecha) return ''
  const str = String(fecha).trim().split(' ')[0].split('T')[0]
  const parts = str.split('-')
  if (parts.length === 3) {
    const anio = parts[0]
    const mesIdx = parseInt(parts[1], 10) - 1
    const dia = parseInt(parts[2], 10)
    if (!isNaN(dia) && mesIdx >= 0 && mesIdx < 12 && anio.length === 4) {
      return `${dia} de ${NOMBRES_MESES[mesIdx]} de ${anio}`
    }
  }
  return str
}

/**
 * Formatea la fecha y hora en el formato exacto requerido con usuario:
 * Ej: "Generado por Juan Pérez el 22/8/2026 a las 4:03:44 p.m."
 */
export function formatearFechaGeneracion(user = null) {
  const now = new Date()
  const dia = now.getDate()
  const mes = now.getMonth() + 1
  const anio = now.getFullYear()

  let horas = now.getHours()
  const minutos = String(now.getMinutes()).padStart(2, '0')
  const segundos = String(now.getSeconds()).padStart(2, '0')
  const ampm = horas >= 12 ? 'p.m.' : 'a.m.'
  horas = horas % 12 || 12

  const nombreUsuario = user?.name || user?.nombre || (user?.email ? user.email.split('@')[0] : '')
  const porTexto = nombreUsuario ? ` por ${nombreUsuario}` : ''

  return `Generado${porTexto} el ${dia}/${mes}/${anio} a las ${horas}:${minutos}:${segundos} ${ampm}`
}

/**
 * Dibuja el membrete oficial en la parte superior del documento PDF.
 * Incluye: Franja vertical azul, Logo de la escuela, Nombre, 3 líneas de datos,
 * y a la derecha el Badge azul con el tipo de reporte y subtítulo/período.
 * 
 * @param {jsPDF} doc Instancia del documento jsPDF
 * @param {Object} options Opciones del membrete
 * @returns {number} Posición Y donde debe comenzar el contenido o tabla (startY)
 */
export function dibujarEncabezadoMembrete(doc, {
  escuelaInfo,
  tipoReporte = 'REPORTE GENERAL',
  subtituloEtiqueta = 'Período:',
  subtituloValor = ''
}) {
  const pageWidth = doc.internal.pageSize.width || 216
  const pageHeight = doc.internal.pageSize.height || 279

  // 1. Barra vertical azul clásica (5mm) decorativa en el borde izquierdo
  doc.setFillColor(37, 99, 235) // #2563eb
  doc.rect(0, 0, 5, pageHeight, 'F')

  // 2. Logo oficial de la escuela (o placeholder neutro)
  const logoX = 14
  const logoY = 12
  const logoSize = 25

  if (escuelaInfo?.logoBase64) {
    try {
      const ext = escuelaInfo.logoBase64.includes('png') ? 'PNG' : 'JPEG'
      doc.addImage(escuelaInfo.logoBase64, ext, logoX, logoY, logoSize, logoSize)
    } catch (e) {
      console.warn('Error dibujando logo en PDF:', e)
    }
  } else {
    // Placeholder circular elegante sin logo
    doc.setFillColor(241, 245, 249)
    doc.roundedRect(logoX, logoY, logoSize, logoSize, 3.5, 3.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(37, 99, 235)
    doc.text('TKD', logoX + logoSize / 2, logoY + logoSize / 2 + 4.5, { align: 'center' })
  }

  // 3. Datos de la Escuela (Nombre, Dirección, Contacto)
  const textLeftX = logoX + logoSize + 5.5
  let curY = 16.5

  // Nombre de la escuela
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(15, 23, 42) // #0f172a (slate-900)
  doc.text((escuelaInfo?.nombre || 'MI ESCUELA').toUpperCase(), textLeftX, curY)

  // Formateo de las 3 líneas descriptivas requeridas
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.8)
  doc.setTextColor(100, 116, 139) // #64748b

  const d = escuelaInfo?.direccion

  // Línea 1: Ciudad, Estado
  const partesCiudadEstado = []
  if (d?.ciudad) partesCiudadEstado.push(d.ciudad)
  if (d?.estado) partesCiudadEstado.push(d.estado)
  const linea1 = partesCiudadEstado.join(', ')

  if (linea1) {
    curY += 4.5
    doc.text(linea1, textLeftX, curY)
  }

  // Línea 2: Calle y número, Colonia
  let calleNum = ''
  if (d?.calle) {
    const num = d.numero_exterior ? ` #${d.numero_exterior}` : ''
    const numInt = d.numero_interior ? ` Int. ${d.numero_interior}` : ''
    calleNum = `${d.calle}${num}${numInt}`
  }
  let colStr = ''
  if (d?.colonia) {
    colStr = d.colonia
  }
  const linea2 = [calleNum, colStr].filter(Boolean).join(', ')

  if (linea2) {
    curY += 4
    doc.text(linea2, textLeftX, curY)
  }

  // Línea 3: Tel. {telefono} | Email: {email}
  const contactParts = []
  if (escuelaInfo?.telefono) contactParts.push(`Tel. ${escuelaInfo.telefono}`)
  if (escuelaInfo?.email) contactParts.push(`Email: ${escuelaInfo.email}`)
  const linea3 = contactParts.join(' | ')

  if (linea3) {
    curY += 4
    doc.text(linea3, textLeftX, curY)
  }

  // 4. Badge Azul a la derecha con el Tipo de Reporte
  const badgeWidth = 60
  const badgeHeight = 9.5
  const badgeX = pageWidth - badgeWidth - 14
  const badgeY = 12

  doc.setFillColor(37, 99, 235) // #2563eb
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.2, 1.2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(255, 255, 255)
  doc.text(tipoReporte.toUpperCase(), badgeX + (badgeWidth / 2), badgeY + 6.3, { align: 'center' })

  // 5. Subtítulo / Período debajo del Badge
  if (subtituloValor) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.8)
    doc.setTextColor(100, 116, 139)
    doc.text(subtituloEtiqueta, badgeX, badgeY + badgeHeight + 4.8)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.2)
    doc.setTextColor(15, 23, 42)
    doc.text(subtituloValor.toUpperCase(), badgeX, badgeY + badgeHeight + 9)
  }

  // Retorna la posición Y recomendada para iniciar la tabla o contenido principal
  return 47
}

/**
 * Agrega el pie de página membretado con la fecha de generación, usuario y números de página
 * a todas las páginas del documento.
 */
export function agregarPieDePagina(doc, user = null) {
  const totalPages = doc.internal.getNumberOfPages()
  const fechaGen = formatearFechaGeneracion(user)

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const pageWidth = doc.internal.pageSize.width || 216
    const pageHeight = doc.internal.pageSize.height || 279

    // Barra vertical azul lateral clásica (5mm)
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 5, pageHeight, 'F')

    // Línea divisoria sutil
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11)

    // Texto de fecha de generación y usuario
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.8)
    doc.setTextColor(148, 163, 184)
    doc.text(fechaGen, 14, pageHeight - 6.5)

    // Numeración de páginas si es más de 1 página
    if (totalPages > 1) {
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 6.5, { align: 'right' })
    }
  }
}

/**
 * Guarda o descarga el documento PDF de forma segura en dispositivos móviles y web
 * sin recargar la página ni perder el estado/filtros actuales.
 */
export async function guardarODescargarPDF(doc, filename) {
  try {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const blob = doc.output('blob')

    // Si es móvil y tiene soporte nativo para compartir/guardar archivos (iOS / Android)
    if (isMobile && navigator.canShare) {
      const file = new File([blob], filename, { type: 'application/pdf' })
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: filename,
          })
          return true
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            return true // El usuario simplemente canceló el diálogo de compartir
          }
        }
      }
    }

    // Descarga limpia vía Blob URL sin recargar la página ni cambiar de pestaña
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.target = '_self'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()

    setTimeout(() => {
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }, 1500)

    return true
  } catch (e) {
    // Fallback estándar
    doc.save(filename)
    return true
  }
}
