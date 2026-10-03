# Instrucciones de Migración — DonBeni Bodegón

Guía para instalar el sistema en la PC del cliente y, si algo falla, para que un
agente de IA pueda diagnosticar y arreglarlo sin perder tiempo.

> **Contexto del proyecto**: FastAPI + SQLite (backend) y React 19 + Vite + MUI
> (frontend). Todo local, sin servicios externos salvo la tasa BCV. Lee `AGENTS.md`
> para el detalle del funcionamiento; este documento solo cubre la instalación.

---

## 1. Escenario exacto

1. Copiar la carpeta `DBMinimarket/` completa a la PC del cliente, en
   `C:\Users\<cliente>\Documents\`.
2. Copiar la base de datos del cliente encima, en la **raíz** de esa carpeta:
   `C:\Users\adria\Downloads\minimarket.db` → `minimarket.db`.
   (Sobrescribe la que venga en la carpeta.)
3. Ejecutar `instalar.bat`.
4. Ejecutar `iniciar.bat`.

La base debe quedar en la raíz porque, sin `MINIMARKET_DATA_DIR`, `paths.py:26`
resuelve el directorio de datos a la carpeta del proyecto.

---

## 2. Advertencias antes de tocar nada

### 2.1 NO copiar `minimarketmg.db`

Ese archivo dispara un flujo distinto. `instalar.bat` **no** lo usa, pero si
alguien lo copia y ejecuta `python migrar_seed.py`, ese script hace
`DELETE FROM <tabla>` sobre **todas** las tablas (`migrar_seed.py:32`) y luego
importa desde `minimarketmg.db`. Como esa base tiene **9** categorías y la del
cliente tiene **10**, se perdería la categoría **“Bebidas Alcohólicas”**.

→ Para esta migración **no se ejecuta `migrar_seed.py`**. Copiar `minimarket.db`
directamente es más simple y más seguro.

### 2.2 NO copiar `smilla.db`

`instalar.bat:81` detecta `smilla.db` y lanza `migrar_smilla.py`. No debe estar
presente en esta instalación.

### 2.3 NO copiar estas carpetas

| Carpeta / archivo | Por qué |
|---|---|
| `venv/` | `instalar.bat` la reutiliza si existe, pero copiarla de otra PC puede traer rutas rotas. Que la recree. |
| `frontend/node_modules/` | `instalar.bat:62-65` **la borra** sin falta. Copiarla es gastar tiempo en el traslado para que se descarte. |
| `frontend/package-lock.json` | `instalar.bat:66-68` **lo borra**. |
| `secret_key.txt` | Es la clave de firma de sesiones de **esta** PC. Debe generarse nueva en el cliente. |
| `logs/` | Logs de tu PC, sin valor para el cliente. |
| `frontend/dist/` | No se usa en esta instalación (ver §5.3). |

### 2.4 ⚠️ Si `Documents` está sincronizado con OneDrive

SQLite sobre OneDrive es una combinación con problemas conocidos: el archivo de
datos puede quedar bloqueado o generar conflictos de sincronización que
corrompen la BD.

→ **Recomendación fuerte**: copiar el sistema a `C:\MinimarketDB\` (o
`C:\DonBeni\`), fuera de OneDrive. Si aun así queda en `Documents`, confirmar que
la carpeta está marcada como “Siempre disponible en este equipo”.

---

## 3. Estado verificado de la base del cliente

Comprobado leyendo `C:\Users\adria\Downloads\minimarket.db` en modo solo lectura.

| Tabla | Filas | Nota |
|---|---:|---|
| `categories` | 10 | Incluye **“Bebidas Alcohólicas”** (id=3), `sale_unit='unidad'` |
| `products` | 88 | 17 en Bebidas, **1 en Bebidas Alcohólicas**, 70 sin categoría |
| `sales` | 75 | — |
| `purchases` | **0** | ⚠️ ver §3.1 |
| `users` | 3 | `admin`, `naty` (admin), `vendedor1` (vendedor) |
| `exchange_rates` | 1 | `rate=900.0` (tasa manual vigente) |

El nombre “Bebidas Alcohólicas” está bien codificado (`ó` = U+00F3, sin mojibake).

### 3.1 ⚠️ `seed_data.py` inyectará compras de demostración

`instalar.bat:76` ejecuta `python seed_data.py`. **No es destructivo**: cada
bloque está protegido con `if db.query(X).count() == 0`, así que los datos
existentes se respetan.

Pero como `purchases` está **vacía**, la semilla **sí insertará compras de
demostración** en la base real del cliente.

Además, el bloque *backfill* asignará categoría a los **70 productos sin
categoría** — solo si el nombre coincide **exactamente** con un producto de la
semilla (mapeo por nombre completo, para evitar falsos positivos).

**Cómo evitar la contaminación de compras demo:**

Opción A — recomendada. Antes de copiar la base, insertar una compra descartable
para que la semilla la salte:

```sql
INSERT INTO purchases (supplier, total, created_at) VALUES ('__migracion__', 0, '2026-01-01 00:00:00');
```

Opción B — después de instalar, borrar las compras demo por proveedor:

```sql
DELETE FROM purchase_details WHERE purchase_id IN (
  SELECT id FROM purchases WHERE supplier LIKE '%Demo%' OR supplier LIKE '%Proveedor%'
);
DELETE FROM purchases WHERE supplier LIKE '%Demo%' OR supplier LIKE '%Proveedor%';
```

> Los `supplier` exactos los imprime la salida de `seed_data.py`. Revisar esa
> salida antes de borrar, para no confundir compras reales con demos.

---

## 4. Columnas que se agregan solas al arrancar

`create_all` **no altera tablas existentes**, pero `database.py` corre
`habilitar_columnas()` en el arranque (`lifespan`), que es idempotente. A la base
del cliente le faltan 9 columnas y **todas están cubiertas**:

| Tabla | Columnas que se agregan |
|---|---|
| `products` | `units_per_pack`, `pack_price`, `allow_pack`, `allow_half_pack`, `allow_half_unit` |
| `sale_details` | `presentacion` |
| `sales` | `method_2`, `received_2`, `reference_2` |
| `exchange_rates` | `sale_rate`, `sale_rate_updated_at` |

`exchange_rates` además conserva 4 columnas obsoletas (`bcv_rate`,
`tasa_manual`, `tasa_manual_fecha`, `tasa_manual_usd`) que el modelo ya ignora.
Son inofensivas: no producen error ni aviso.

**No hace falta migrar el esquema a mano.** Basta con arrancar la app una vez.

---

## 5. Instalación

### 5.1 Requisitos

- **Python 3.12 o 3.13**, con “Add Python to PATH” marcado.
- **Node.js LTS** — obligatorio: la app usa el servidor de desarrollo de Vite.

### 5.2 Qué hace `instalar.bat`

En orden, con los puntos donde puede fallar:

| # | Paso | Falla si… |
|---|---|---|
| 1 | Verifica Python | No está en PATH |
| 2 | Verifica Node.js | No está en PATH |
| 3 | Crea `venv` | Python mal instalado |
| 4 | `pip install -r requeriments.txt` | Sin internet / proxy |
| 5 | **Borra** `node_modules` + `package-lock.json`, luego `npm install` | Sin internet / proxy |
| 6 | `python seed_data.py` | Ver §3.1 |
| 7 | `migrar_smilla.py` **solo si existe `smilla.db`** | No debe existir (§2.2) |
| 8 | Accesos directos | Fallo silencioso, **no detiene** la instalación |

El archivo de dependencias se llama **`requeriments.txt`** (sin la segunda “i”).
`instalar.bat` intenta primero ese nombre y acepta `requirements.txt` como
alternativa, pero el real es el mal escrito.

### 5.3 No hace falta compilar el frontend

`instalar.bat` **no** ejecuta `npm run build`, y no es un error: `iniciar.ps1:51`
levanta `npm run dev` (Vite) y sirve la UI en `:5173` mientras el backend corre en
`:8000`. El proxy de Vite ya apunta `/api` al backend, así que no hay que tocar
nada.

---

## 6. ⚡ Cómo evitar perder tiempo en la instalación

Este es el punto crítico. Si algo falla, **NO** hay que relanzar
`instalar.bat` desde cero.

### 6.1 El error más caro: relanzar `instalar.bat`

`instalar.bat:62-68` **borra `node_modules` y `package-lock.json` en cada
ejecución**. Relanzarlo obliga a reinstallar ~400 paquetes de npm desde cero
(5-15 min) aunque el problema fuera otro.

### 6.2 Qué hacer según dónde falló

| Falló en | Qué hacer | Tiempo |
|---|---|---|
| **1-2** (Python / Node) | Instalar el faltante, y relanzar `instalar.bat` completo | ~15 min |
| **3** (venv) | Borrar `venv` y relanzar. Suele ser permisos/antivirus | ~15 min |
| **4** (pip) | **No relanzar el .bat.** Ejecutar solo lo que falta (abajo) | ~1 min |
| **5** (npm) | **No relanzar el .bat.** Ejecutar solo `npm install` | ~5-15 min |
| **6-8** | **No relanzar el .bat.** Ir directo al paso | <1 min |

Reanudación manual (desde la raíz, con el venv ya creado):

```powershell
# Paso 4 — solo Python
venv\Scripts\python.exe -m pip install -r requeriments.txt

# Paso 5 — solo el frontend (¡NO borrar node_modules ni el lock!)
cd frontend
npm install
cd ..
```

### 6.3 Otros atajos

- **No copiar** `venv` ni `node_modules` desde la PC de origen (§2.3): el ahorro de
  tiempo en el traslado es mayor que el de la instalación.
- Si `pip` falla por red, probar un espejo:
  `venv\Scripts\python.exe -m pip install -i https://pypi.org/simple -r requeriments.txt`
- Si `npm` falla por red, probar:
  `npm install --registry=https://registry.npmjs.org`
- El `seed_data.py` es idempotente: relanzarlo es inofensivo.
- Si la instalación se completó pero los accesos directos fallaron, se pueden
  crear por separado, sin relanzar nada:
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File .\crear-acceso-directo.ps1
  ```

---

## 7. Primer arranque y verificación

```powershell
iniciar.bat
```

`iniciar.ps1` hace, en orden: backend en `:8000` (espera hasta 30 s a
`/api/health`), Vite en `:5173`, abre Edge o Chrome en perfil aislado, y **se
queda esperando a que se cierre el navegador** para apagar los servidores.

Verificación:

```powershell
# Debe responder 200
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8000/api/health
```

Y confirmar que los datos reales están cargados:

```powershell
venv\Scripts\python.exe -c "import sqlite3; c=sqlite3.connect('file:minimarket.db?mode=ro', uri=True); print('products', c.execute('select count(*) from products').fetchone()[0]); print('sales', c.execute('select count(*) from sales').fetchone()[0]); print('categories', c.execute('select count(*) from categories').fetchone()[0])"
```

Valores esperados **en la PC del cliente**, con su base copiada:

```
products 88
sales 75
categories 10
```

Si `products` o `sales` salen muy distintos, casi seguro no se está usando la base
del cliente: confirmar la ruta con
`venv\Scripts\python.exe -c "from paths import DATABASE_PATH; print(DATABASE_PATH)"`
(§8.2). Un `categories 10` con productos de demo indicaría que la semilla corrió
sobre una base vacía en lugar de la copiada.

---

## 8. Diagnóstico para agente de IA

### 8.1 Leer los logs primero

Siempre antes de hypothesize:

```
logs\sistema.log        → línea de tiempo del arranque
logs\backend_err.log    → errores del backend (uvicorn / tracebacks)
logs\frontend_err.log   → errores de Vite
logs\backend_out.log    → salida estándar del backend
```

### 8.2 Comprobación rápida del estado

```powershell
# Puertos ocupados
Get-NetTCPConnection -State Listen -LocalPort 8000,5173 -ErrorAction SilentlyContinue |
  Select-Object LocalPort, OwningProcess
Get-Process -Id (Get-NetTCPConnection -State Listen -LocalPort 8000,5173 -EA SilentlyContinue).OwningProcess -EA SilentlyContinue |
  Select-Object Id, ProcessName

# La base que realmente se está usando
venv\Scripts\python.exe -c "from paths import DATABASE_PATH; print(DATABASE_PATH)"
```

> Si `DATABASE_PATH` **no** apunta a la carpeta del proyecto, hay un
> `MINIMARKET_DATA_DIR` heredado del entorno. La app estaría usando otra base y los
> datos “desaparecidos” están intactos en otra parte.

### 8.3 Tabla de errores y causa real

| Síntoma | Causa probable | Solución |
|---|---|---|
| `[ERROR] No se encontro Python` | Python no está en PATH | Reinstalar marcando “Add Python to PATH” |
| `[ERROR] No se encontro Node.js` | Node no instalado | Instalar Node.js LTS |
| `[ERROR] No se pudo crear el entorno virtual venv` | Permisos o antivirus | Borrar `venv`, ejecutar como administrador, desactivar AV |
| `[ERROR] Fallo la instalacion de dependencias de Python` | Red / proxy | Reanudar solo el paso 4 (§6.2) |
| `[ERROR] Fallo npm install en el frontend` | Red / proxy / lock corrupto | Reanudar solo `npm install` (§6.2) |
| `[ERROR] Fallo la carga de la semilla de datos` | BD bloqueada o corrupta | Ver §8.4 |
| Acceso denegado al ejecutar .bat/ps1 | Política de ejecución | ` powershell -ExecutionPolicy Bypass -File .\iniciar.ps1` |
| “El puerto 8000 está ocupado” | Instancia anterior viva | Matar el proceso del §8.2 y relanzar `iniciar.bat` |
| Pantalla en blanco en `:5173` | Vite no arrancó | Revisar `logs\frontend_err.log` |
| La interfaz no carga datos | Backend caído | Revisar `logs\backend_err.log` |
| `database is locked` | OneDrive / dos instancias | Mover fuera de OneDrive (§2.4) |
| Faltan columnas al consultar | `habilitar_columnas()` no corrió | Arrancar la app una vez completa |

### 8.4 BD corrupta o bloqueada

```powershell
# Integridad (solo lectura, no modifica nada)
venv\Scripts\python.exe -c "import sqlite3; c=sqlite3.connect('file:minimarket.db?mode=ro', uri=True); print(c.execute('pragma integrity_check').fetchone()[0])"

# Si dice 'malformed' o 'corrupt':
#   1. restaurar la copia de C:\Users\adria\Downloads\minimarket.db
#   2. NO intentar reparar con herramientas de terceros sobre la base del cliente
```

> La fuente de verdad es la copia en `C:\Users\adria\Downloads\minimarket.db`.
> Ante cualquier duda sobre integridad, restaurar desde ahí. Conservar la copia
> original hasta que el cliente confirme que todo funciona.

### 8.5 Principio general para el agente

1. **Leer `logs\backend_err.log` antes de tocar nada.** El error real casi
   siempre está ahí.
2. **No relanzar `instalar.bat`** para resolver un problema localized (§6.1).
3. **No ejecutar `migrar_seed.py` ni `POST /api/admin/limpiar-datos`.**
   El primero borra todas las tablas (`migrar_seed.py:32`); el segundo borra todos
   los datos operativos y está protegido solo por una clave fija en el código.
4. **Una variable a la vez.** Cambios múltiples a la vez impiden saber qué arregló
   qué.
5. **Backups sin trampas:** `*.db` está en `.gitignore`, pero
   `minimarket.db.bak_caja` está trackeado porque el patrón no lo cubre. Si se crea
   un backup, terminarlo en `.db` (`minimarket_backup_2026.db`) para que siga
   ignorado.

---

## 9. Gotchas conocidos del repositorio

Verificados; no son errores del proceso de instalación:

- **El build de PyInstaller no funciona**: `packaging/build.ps1` referencia
  `packaging/MinimarketDB.spec`, que no existe (y `*.spec` está gitignored). Esta
  instalación **no lo necesita** porque usa Vite.
- **El CI no se ejecuta**: `frontend/.github/workflows/react-doctor.yml` está
  dentro de `frontend/`, no en `.github/` de la raíz, así que GitHub Actions nunca
  lo corre.
- **`check_db.py` no es utilizable**: tiene una ruta hardcodeada ajena
  (`C:\Users\MERCEDES\...`).
- **Columnas de presentaciones**: `units_per_pack`, `pack_price`, `allow_pack`,
  `allow_half_pack`, `allow_half_unit` controlan la venta por caja, media caja y
  media unidad. Si un producto no las tiene, se vende solo por unidad. Se
  administran en Inventario → producto.
- **`CuentasPorCobrar.jsx` y `VentaCredito.jsx`** no están importados en ninguna
  parte. Si “falta” una vista de créditos, es porque ese componente no está
  conectado.
- **`Ventas.jsx` y `Creditos.jsx`** pesan cientos de KB. Editarlos con cuidado.
- **El día de negocio es el de Venezuela.** Las fechas se guardan en UTC naive pero
  los cortes diarios son locales. El Reporte Z bloquea editar o eliminar ventas de
  un día ya cerrado (409).

---

## 10. Referencias

| Archivo | Para qué |
|---|---|
| `AGENTS.md` | Funcionamiento interno, convenciones del dominio, gotchas |
| `MIGRACION_BD.md` | Otro flujo distinto: migrar desde `minimarketmg.db` |
| `INSTRUCCIONES.md` | Instrucciones de uso generales |
| `instalar.bat` | Instalador (pasos 1-8 en §5.2) |
| `iniciar.ps1` | Arranque, health check, apagado |
| `paths.py` | Resuelve dónde está la BD |
| `database.py` | `habilitar_columnas()`: migración de esquema |
| `seed_data.py` | Semilla de demo; guards `count() == 0` (§3.1) |
| `migrar_seed.py` | **Destructivo** (`DELETE FROM`, línea 32). No usar aquí |