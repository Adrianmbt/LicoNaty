"""
Verifica que el frontend y el backend apliquen las MISMAS reglas.

El frontend tiene `frontend/src/utils/presentaciones.js` y el backend
`presentaciones.py`. Si divergen, la app cobra distinto de lo que muestra.
Este test ejecuta el JS con node y compara resultados.

Si node no está disponible, el test se omite (skip) en vez de fallar.
"""

import json
import shutil
import subprocess
from pathlib import Path

import pytest

from presentaciones import (
    precio_por_unidad,
    presentaciones_disponibles,
    resolver_presentacion,
    unidades_por_presentacion,
)

RAIZ = Path(__file__).resolve().parent
JS = RAIZ / "frontend" / "src" / "utils" / "presentaciones.js"

# Productos de prueba: (nombre, sale_price, units_per_pack, allow_pack,
#                       allow_half_pack, allow_half_unit)
CASOS = [
    ("normal", 16.0, None, False, False, False),
    ("ron_completo", 16.0, 12, True, True, True),
    ("lata_solo_caja", 2.0, 24, True, False, False),
    ("media_unidad", 20.0, None, False, False, True),
    ("caja_con_precio", 2.0, 24, True, False, False),
]

CANTIDADES = [0.5, 1, 1.5, 2, 6, 12, 13, 24, 48]


class Prod:
    """Doble de prueba con los atributos que leen las reglas."""

    def __init__(self, sale_price, units_per_pack, allow_pack, allow_half_pack, allow_half_unit):
        self.sale_price = sale_price
        self.units_per_pack = units_per_pack
        self.allow_pack = allow_pack
        self.allow_half_pack = allow_half_pack
        self.allow_half_unit = allow_half_unit
        self.sale_unit = "unidad"


def _correr_js(casos, cantidades):
    """Ejecuta el módulo JS con node y devuelve los resultados."""
    node = shutil.which("node")
    if not node:
        pytest.skip("node no disponible; se omite la comparación JS")

    payload = json.dumps({"casos": casos, "cantidades": cantidades})
    codigo = f"""
const mod = require({json.dumps(str(JS))});
const entrada = JSON.parse(process.argv[1]);
const salida = entrada.casos.map(c => ({{
  disponibles: mod.presentacionesDisponibles(c.p),
  porCantidad: entrada.cantidades.map(q => mod.resolverPresentacion(c.p, q, null)),
  precios: mod.presentacionesDisponibles(c.p).map(pr => [pr, mod.precioPorUnidad(c.p, pr)]),
}}));
console.log(JSON.stringify(salida));
"""
    proc = subprocess.run(
        [node, "-e", codigo, payload],
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert proc.returncode == 0, f"node falló: {proc.stderr}"
    return json.loads(proc.stdout)


def _casos_js():
    """Mismo shape que Prod pero en dict, para el JSON."""
    return [
        {
            "n": n,
            "p": {
                "sale_price": sp,
                "units_per_pack": upp,
                "allow_pack": ap,
                "allow_half_pack": ahp,
                "allow_half_unit": ahu,
                "sale_unit": "unidad",
            },
        }
        for n, sp, upp, ap, ahp, ahu in CASOS
    ]


def test_frontend_y_backend_coinciden():
    """Las reglas JS y Python deben dar exactamente lo mismo."""
    js = _correr_js(_casos_js(), CANTIDADES)

    for i, (_, sp, upp, ap, ahp, ahu) in enumerate(CASOS):
        prod = Prod(sp, upp, ap, ahp, ahu)

        # 1) Presentaciones disponibles
        py_disponibles = presentaciones_disponibles(prod)
        assert js[i]["disponibles"] == py_disponibles, (
            f"Presentaciones difieren para el caso {i}: "
            f"JS={js[i]['disponibles']} Python={py_disponibles}"
        )

        # 2) Resolución por cantidad
        for j, q in enumerate(CANTIDADES):
            py_res = resolver_presentacion(prod, q)
            js_res = js[i]["porCantidad"][j]
            assert js_res == py_res, (
                f"Caso {i} cantidad {q}: JS={js_res!r} Python={py_res!r}"
            )

        # 3) Precio por unidad
        py_precios = {
            p: round(precio_por_unidad(prod, p), 6) for p in py_disponibles
        }
        js_precios = {p: round(v, 6) for p, v in js[i]["precios"]}
        assert js_precios == py_precios, (
            f"Precios difieren para el caso {i}: JS={js_precios} Python={py_precios}"
        )


def test_unidades_por_presentacion_coinciden():
    """Las unidades de cada presentación deben coincidir en ambos lados."""
    node = shutil.which("node")
    if not node:
        pytest.skip("node no disponible")

    _, sp, upp, ap, ahp, ahu = CASOS[1]
    prod = Prod(sp, upp, ap, ahp, ahu)
    p_js = {
        "sale_price": sp, "units_per_pack": upp,
        "allow_pack": ap, "allow_half_pack": ahp,
        "allow_half_unit": ahu, "sale_unit": "unidad",
    }
    pres = ["unidad", "media_unidad", "media_caja", "caja"]

    codigo = f"""
const mod = require({json.dumps(str(JS))});
const p = {json.dumps(p_js)};
console.log(JSON.stringify({pres}.map(x => mod.unidadesPorPresentacion(p, x))));
"""
    proc = subprocess.run([node, "-e", codigo], capture_output=True, text=True, timeout=60)
    assert proc.returncode == 0, proc.stderr
    js = json.loads(proc.stdout)

    for valor_js, p in zip(js, pres):
        valor_py = unidades_por_presentacion(prod, p)
        if valor_py is None:
            assert valor_js is None, f"{p}: JS={valor_js} Python=None"
        else:
            assert abs(valor_js - valor_py) < 1e-9, f"{p}: JS={valor_js} Python={valor_py}"


def test_caso_lata_rechaza_media_caja():
    """Verificación puntual de la regla que pidió el cliente.

    Una lata con 24 por caja y solo 'caja' habilitada: 12 unidades sueltas es
    venta por unidad (válido), pero 'media caja' como presentación no existe.
    """
    prod = Prod(2.0, 24, True, False, False)
    assert presentaciones_disponibles(prod) == ["unidad", "caja"]
    # 12 sin presentación explícita se resuelve como unidad (12 unidades).
    assert resolver_presentacion(prod, 12) == "unidad"
    # Pero "media caja" explícita no está disponible.
    assert resolver_presentacion(prod, 12, "media_caja") is None


# Productos con pack_price explícito: (nombre, sale_price, units_per_pack,
#                                       pack_price, allow_pack,
#                                       allow_half_pack, allow_half_unit)
CASOS_PRECIO = [
    ("caja_precio_propio", 2.0, 24, 180.0, True, True, False),
    ("caja_precio_cero", 2.0, 24, 0.0, True, False, False),
    ("media_unidad_solo", 20.0, None, None, False, False, True),
]

PRESENTACIONES = ["unidad", "media_unidad", "media_caja", "caja"]


def test_presentacion_explicita_coincide_entre_js_y_python():
    """El carrito envía la presentación explícita; ambos lados deben coincidir.

    Si divergen, el carrito cobra un precio y el backend otro. Se recorren todas
    las combinaciones de cantidad x presentación, incluidas las inválidas.
    """
    node = shutil.which("node")
    if not node:
        pytest.skip("node no disponible")

    casos = [
        {
            "p": {
                "sale_price": sp,
                "units_per_pack": upp,
                "pack_price": pk,
                "allow_pack": ap,
                "allow_half_pack": ahp,
                "allow_half_unit": ahu,
                "sale_unit": "unidad",
            }
        }
        for _, sp, upp, pk, ap, ahp, ahu in CASOS_PRECIO
    ]
    payload = json.dumps({"casos": casos, "cantidades": CANTIDADES})

    codigo = f"""
const mod = require({json.dumps(str(JS))});
const e = JSON.parse(process.argv[1]);
const pres = {json.dumps(PRESENTACIONES)};
const salida = e.casos.map(c => ({{
  explicitas: pres.map(p => e.cantidades.map(q => mod.resolverPresentacion(c.p, q, p))),
  precios: pres.map(p => mod.precioPorUnidad(c.p, p)),
}}));
console.log(JSON.stringify(salida));
"""
    proc = subprocess.run([node, "-e", codigo, payload], capture_output=True, text=True, timeout=60)
    assert proc.returncode == 0, f"node falló: {proc.stderr}"
    js = json.loads(proc.stdout)

    for i, (_, sp, upp, pk, ap, ahp, ahu) in enumerate(CASOS_PRECIO):
        prod = Prod(sp, upp, ap, ahp, ahu)
        prod.pack_price = pk

        for k, presentacion in enumerate(PRESENTACIONES):
            # Resolución explícita, cantidad por cantidad.
            for j, q in enumerate(CANTIDADES):
                py_res = resolver_presentacion(prod, q, presentacion)
                js_res = js[i]["explicitas"][k][j]
                assert js_res == py_res, (
                    f"Caso {i} {presentacion} x {q}: JS={js_res!r} Python={py_res!r}"
                )

            # Precio por unidad, incluso para presentaciones no disponibles
            # (el frontend las oculta, pero no debe dar NaN).
            py_precio = round(precio_por_unidad(prod, presentacion), 6)
            js_precio = round(js[i]["precios"][k], 6)
            assert js_precio == py_precio, (
                f"Caso {i} precio {presentacion}: JS={js_precio} Python={py_precio}"
            )