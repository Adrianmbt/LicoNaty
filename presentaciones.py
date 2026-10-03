"""
Reglas de presentaciones de venta.

Fuente única de verdad, replicada en `frontend/src/utils/presentaciones.js`.
Ambos lados deben comportarse igual.

Concepto: el stock SIEMPRE se guarda en unidades. Una "presentación" define
cuántas unidades equivalen a lo que el vendedor cobra:

    unidad        -> 1 unidad
    media_unidad  -> 0.5 unidades   (media unidad real: medio litro de whisky)
    media_caja    -> units_per_pack / 2 unidades
    caja          -> units_per_pack unidades

Cuidado con los precios: `precio_presentacion(p)` es el precio de UNA
presentación p, NO el precio por unidad. Para un producto de $16:

    precio_presentacion('unidad')       = 16.00     (1 unidad)
    precio_presentacion('media_unidad') =  8.00     (0.5 unidades)
    precio_presentacion('caja')         = 192.00    (12 unidades, si pack_price es NULL)

El precio POR UNIDAD bajo una presentación se obtiene dividiendo:

    precio_por_unidad(p) = precio_presentacion(p) / unidades(p)

Para media_unidad eso da 8.00 / 0.5 = 16.00, igual que la unidad normal: la
media unidad no cambia el precio por unidad, solo permite vender fracciones.
"""

from typing import Optional

# Tolerancia para comparar cantidades fraccionarias (0.5, 1.5, 0.75, 5.5...).
_TOL = 1e-9

UNIDAD = "unidad"
MEDIA_UNIDAD = "media_unidad"
MEDIA_CAJA = "media_caja"
CAJA = "caja"


def unidades_por_presentacion(producto, presentacion: str) -> Optional[float]:
    """Unidades que equivalen a UNA presentación. None si no aplica."""
    if presentacion == UNIDAD:
        return 1.0
    if presentacion == MEDIA_UNIDAD:
        # Media unidad es media unidad de verdad, no media caja.
        return 0.5

    factor = getattr(producto, "units_per_pack", None)
    if not factor or factor <= 0:
        return None
    if presentacion == CAJA:
        return float(factor)
    if presentacion == MEDIA_CAJA:
        return factor / 2.0
    return None


def presentaciones_disponibles(producto) -> list[str]:
    """Presentaciones que el vendedor puede elegir, de menor a mayor."""
    if getattr(producto, "sale_unit", "unidad") == "peso":
        # Los productos por peso se miden en gramos; no hay presentaciones.
        return [UNIDAD]

    out = [UNIDAD]
    factor = getattr(producto, "units_per_pack", None)
    tiene_factor = bool(factor and factor > 0)

    if getattr(producto, "allow_half_unit", False):
        out.append(MEDIA_UNIDAD)
    if tiene_factor and getattr(producto, "allow_half_pack", False):
        out.append(MEDIA_CAJA)
    if tiene_factor and getattr(producto, "allow_pack", False):
        out.append(CAJA)
    return out


def _es_multiplo(cantidad: float, unidad: float) -> bool:
    """True si `cantidad` es un múltiplo entero positivo de `unidad`."""
    if unidad <= 0:
        return False
    n = cantidad / unidad
    return abs(n - round(n)) < _TOL and round(n) > 0


def resolver_presentacion(producto, unidades: float, presentacion: str | None = None) -> Optional[str]:
    """Deduce qué presentación se está vendiendo a partir de la cantidad.

    Elige la MÁS GRANDE que calce, porque es la que da el precio correcto: si el
    admin puso un precio de caja explícito, vender 24 unidades debe cobrarse
    como caja, no como 24 unidades sueltas.

    `None` si la cantidad no corresponde a una presentación permitida.

    Si se pasa `presentacion` explícita, se valida contra ella. Si no, se deduce
    de la cantidad (útil cuando el cliente envía solo quantity).
    """
    if presentacion:
        p = str(presentacion)
        u = unidades_por_presentacion(producto, p)
        if u and p in presentaciones_disponibles(producto) and _es_multiplo(unidades, u):
            return p
        return None

    disponibles = presentaciones_disponibles(producto)
    for p in reversed(disponibles):
        u = unidades_por_presentacion(producto, p)
        if u and _es_multiplo(unidades, u):
            return p
    return None


def es_presentacion_valida(producto, unidades: float) -> bool:
    """True si la cantidad corresponde a alguna presentación permitida.

    Un producto sin ninguna casilla activa acepta cualquier entero >= 1, que es
    el comportamiento histórico.
    """
    return resolver_presentacion(producto, unidades) is not None


def precio_presentacion(producto, presentacion: str) -> float:
    """Precio de UNA presentación completa (en USD).

    NULL en pack_price significa "calculado"; un 0 es un precio explícito.
    """
    unit = float(producto.sale_price or 0.0)

    if presentacion == UNIDAD:
        return unit
    if presentacion == MEDIA_UNIDAD:
        # La mitad del precio de una unidad.
        return unit / 2.0

    factor = getattr(producto, "units_per_pack", None)
    if not factor or factor <= 0:
        return unit

    precio_caja = getattr(producto, "pack_price", None)
    if precio_caja is None:
        precio_caja = factor * unit

    if presentacion == CAJA:
        return float(precio_caja)
    if presentacion == MEDIA_CAJA:
        return float(precio_caja) / 2.0
    return unit


def precio_por_unidad(producto, presentacion: str) -> float:
    """Precio de UNA UNIDAD cuando se vende bajo esa presentación."""
    u = unidades_por_presentacion(producto, presentacion)
    if not u:
        return float(producto.sale_price or 0.0)
    return precio_presentacion(producto, presentacion) / u


def subtotal_presentacion(producto, presentacion: str, unidades: float) -> float:
    """Total de la línea: unidades × precio por unidad de esa presentación."""
    return unidades * precio_por_unidad(producto, presentacion)


def validar_presentaciones(producto) -> None:
    """Valida coherencia de la configuración. Lanza ValueError si no cuadra.

    - Si se habilita caja o media caja, hace falta `units_per_pack`.
    - `units_per_pack` debe ser un entero >= 1.
    - `pack_price` no puede ser negativo.
    """
    factor = getattr(producto, "units_per_pack", None)
    usa_caja = bool(
        getattr(producto, "allow_pack", False)
        or getattr(producto, "allow_half_pack", False)
    )

    if factor is not None:
        if int(factor) != factor or factor < 1:
            raise ValueError(
                "Las unidades por caja deben ser un número entero mayor o igual a 1"
            )

    if usa_caja and not factor:
        raise ValueError(
            "Para vender por caja o media caja debes indicar cuántas unidades trae la caja"
        )

    precio = getattr(producto, "pack_price", None)
    if precio is not None and precio < 0:
        raise ValueError("El precio de la caja no puede ser negativo")


def descripcion_presentaciones(producto) -> str:
    """Texto para el error del backend, ej. '1 unidad, 6 media caja, 12 caja'."""
    etiquetas = {
        UNIDAD: "1 unidad",
        MEDIA_UNIDAD: "0.5 media unidad",
        MEDIA_CAJA: "{u:g} media caja",
        CAJA: "{u:g} caja",
    }
    partes = []
    for p in presentaciones_disponibles(producto):
        u = unidades_por_presentacion(producto, p)
        if u is None:
            continue
        partes.append(etiquetas[p].format(u=u))
    return ", ".join(partes) if partes else "1 unidad"