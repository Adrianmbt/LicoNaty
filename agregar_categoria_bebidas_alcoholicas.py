"""
Agrega la categoría "Bebidas Alcohólicas" a la base de datos existente.

Es idempotente: si la categoría ya existe no hace nada. No modifica productos,
ventas ni ninguna otra tabla.

Uso (desde la raíz del repo):
    python agregar_categoria_bebidas_alcoholicas.py
"""

import sys

from database import SessionLocal
from models import Category

NOMBRE = "Bebidas Alcohólicas"
DESCRIPCION = "Cerveza, ron, whisky, vino y otras bebidas con alcohol"
SALE_UNIT = "unidad"


def main() -> int:
    with SessionLocal() as db:
        existente = db.query(Category).filter(Category.name == NOMBRE).first()
        if existente:
            print(f"[OK] La categoría '{NOMBRE}' ya existe (id={existente.id}). No se hizo nada.")
            return 0

        categoria = Category(name=NOMBRE, description=DESCRIPCION, sale_unit=SALE_UNIT)
        db.add(categoria)
        db.commit()
        db.refresh(categoria)
        print(f"[OK] Categoría '{NOMBRE}' creada con id={categoria.id}, sale_unit={categoria.sale_unit}")
        print("     Queda vacía: mueve los productos que quieras desde Inventario.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
