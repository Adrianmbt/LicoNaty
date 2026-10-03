/**
 * Reglas de presentaciones de venta.
 *
 * Réplica exacta de `presentaciones.py` (backend). Si cambias una regla,
 * cámbiala en ambos lados o la app cobra distinto de lo que muestra.
 *
 * El stock SIEMPRE está en unidades. Una "presentación" define cuántas
 * unidades equivalen a lo que el vendedor cobra:
 *
 *   unidad        -> 1 unidad
 *   media_unidad  -> 0.5 unidades  (medio litro de whisky)
 *   media_caja    -> units_per_pack / 2
 *   caja          -> units_per_pack
 *
 * Ojo con los precios: `precioPresentacion(p)` es el precio de UNA
 * presentación completa, no el precio por unidad. Para dividir:
 *
 *   precioPorUnidad(p) = precioPresentacion(p) / unidades(p)
 */

export const UNIDAD = 'unidad'
export const MEDIA_UNIDAD = 'media_unidad'
export const MEDIA_CAJA = 'media_caja'
export const CAJA = 'caja'

// Etiquetas para el vendedor.
export const ETIQUETAS = {
  [UNIDAD]: 'Unidad',
  [MEDIA_UNIDAD]: '½',
  [MEDIA_CAJA]: '½ caja',
  [CAJA]: 'Caja',
}

/** Unidades que equivalen a UNA presentación. null si no aplica. */
export function unidadesPorPresentacion(producto, presentacion) {
  if (presentacion === UNIDAD) return 1
  if (presentacion === MEDIA_UNIDAD) return 0.5

  const factor = Number(producto?.units_per_pack) || 0
  if (factor <= 0) return null
  if (presentacion === CAJA) return factor
  if (presentacion === MEDIA_CAJA) return factor / 2
  return null
}

/** Presentaciones que el vendedor puede elegir, de menor a mayor. */
export function presentacionesDisponibles(producto) {
  if (!producto) return [UNIDAD]
  // Los productos por peso se miden en gramos; no hay presentaciones.
  if (producto.sale_unit === 'peso') return [UNIDAD]

  const out = [UNIDAD]
  const factor = Number(producto?.units_per_pack) || 0
  const tieneFactor = factor > 0

  if (producto.allow_half_unit) out.push(MEDIA_UNIDAD)
  if (tieneFactor && producto.allow_half_pack) out.push(MEDIA_CAJA)
  if (tieneFactor && producto.allow_pack) out.push(CAJA)
  return out
}

const esMultiplo = (cantidad, unidad) => {
  if (!unidad || unidad <= 0) return false
  const n = cantidad / unidad
  return Math.abs(n - Math.round(n)) < 1e-9 && Math.round(n) > 0
}

/**
 * Deduce la presentación a partir de la cantidad (o valida la explícita).
 * Devuelve null si no corresponde a ninguna presentación permitida.
 */
export function resolverPresentacion(producto, unidades, presentacion) {
  const disponibles = presentacionesDisponibles(producto)

  if (presentacion) {
    const u = unidadesPorPresentacion(producto, presentacion)
    return u && disponibles.includes(presentacion) && esMultiplo(unidades, u)
      ? presentacion
      : null
  }

  for (let i = disponibles.length - 1; i >= 0; i--) {
    const p = disponibles[i]
    const u = unidadesPorPresentacion(producto, p)
    if (u && esMultiplo(unidades, u)) return p
  }
  return null
}

/** Precio de UNA presentación completa (USD). */
export function precioPresentacion(producto, presentacion) {
  const unit = Number(producto?.sale_price) || 0

  if (presentacion === UNIDAD) return unit
  if (presentacion === MEDIA_UNIDAD) return unit / 2

  const factor = Number(producto?.units_per_pack) || 0
  if (factor <= 0) return unit

  // null en pack_price significa "calculado"; un 0 es un precio explícito.
  const precioCaja = producto.pack_price == null ? factor * unit : Number(producto.pack_price)

  if (presentacion === CAJA) return precioCaja
  if (presentacion === MEDIA_CAJA) return precioCaja / 2
  return unit
}

/** Precio de UNA UNIDAD cuando se vende bajo esa presentación. */
export function precioPorUnidad(producto, presentacion) {
  const u = unidadesPorPresentacion(producto, presentacion)
  if (!u) return Number(producto?.sale_price) || 0
  return precioPresentacion(producto, presentacion) / u
}

/** ¿El producto tiene alguna presentación además de la unidad? */
export function tienePresentaciones(producto) {
  return presentacionesDisponibles(producto).length > 1
}

/** Configuración incompleta: el admin marcó caja/media caja sin factor. */
export function presentacionIncompleta(form) {
  const factor = parseInt(form.units_per_pack, 10)
  if (!factor || factor < 1) {
    return Boolean(form.allow_pack || form.allow_half_pack)
  }
  return false
}

/** Precio de la caja: el del admin o el calculado. null si no aplica. */
export function precioCajaDe(form) {
  const factor = parseInt(form.units_per_pack, 10)
  if (!factor || factor < 1) return null
  if (form.pack_price !== '' && form.pack_price != null) return Number(form.pack_price)
  return factor * (Number(form.sale_price) || 0)
}