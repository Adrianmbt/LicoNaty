# AGENTS.md — Don Beni Minimarket

Sistema de gestión de minimarket (inventario, ventas, compras, caja/Reporte Z, créditos).
Backend FastAPI + SQLite, frontend React 19 + Vite + MUI. Todo local en una PC; sin servicios externos salvo la tasa BCV.

## Comandos

Todo el backend se ejecuta desde la raíz del repo (los módulos se importan como top-level).

```powershell
# Tests (backend, un solo archivo de tests)
python -m pytest test_main.py          # requiere instalar deps primero
python -m pytest test_main.py -k test_login

# Backend en desarrollo (puerto 8000)
python -m uvicorn main:app --reload --port 8000

# Frontend en desarrollo (puerto 5173, proxy /api -> localhost:8000)
npm run dev        # workdir: frontend
npm run build      # genera frontend/dist

# Linter del frontend (no hay script "lint" en package.json)
npx oxlint         # workdir: frontend
```

- **Archivo de dependencias: `requeriments.txt` (sic, sin la segunda "i")**. No existe `requirements.txt`; `instalar.bat` acepta ambos pero el real es el mal escrito.
- Instalación completa Windows: `instalar.bat` (crea venv, deps, semilla, accesos directos). Arranque diario: `iniciar.bat` / `iniciar.ps1`.
- El entorno de desarrollo espera un venv en `venv\Scripts\python.exe`. Las instrucciones de instalación dicen Python 3.13 (README) y 3.8+ (INSTRUCCIONES).

## Arquitectura

- `main.py` crea la app, monta routers y middleware de seguridad. `entry.py` es el launcher PyInstaller (sirve frontend compilado en `:8000` y abre navegador).
- Routers en `routers/` (uno por dominio), modelos SQLAlchemy en `models.py`, esquemas Pydantic en `schemas.py`, PDFs en `services/pdf.py`, tasa BCV en `services/bcv.py`.
- `frontend_static.py` sirve `frontend/dist` desde FastAPI **si existe**; si no, Vite sirve la UI por separado. No toques `frontend/src/api/axios.js` ni `frontend/vite.config.js` (URL relativa `/api` + proxy ya resuelven local y LAN).
- Ruteo del frontend en `frontend/src/App.jsx`; las páginas admin se filtran por `user.role` tanto en UI (`Layout.jsx`, `adminOnly`) como en backend (`requiere_admin`).

## Convenciones críticas del dominio

- **Todo el dinero se guarda canónicamente en USD.** `total`, `cost_price`, `sale_price` son USD; la conversión a Bs se hace al mostrar/cobrar con `rate_usd`. No agregues columnas en Bs.
- Los precios ya **incluyen impuestos**; solo se desglosan. IVA 16% siempre; IGTF 3% solo para `Dólares Efectivo` y proporcional en métodos `Mixto` (`routers/ventas.py`: `_desglose_impuestos`).
- Productos de categoría `peso`: el **stock se guarda en gramos** y los precios son por kg. La categoría define `sale_unit` (unidad/peso); no lo edites por producto.
- Fechas: se guardan en **UTC sin tz** (`models.utcnow`), pero el "día de negocio" es local (Venezuela). Usa `_rango_dia_utc` / `_parse_fecha` en `routers/ventas.py` para rangos diarios.
- Un cierre Z (`cierres_diarios`) **bloquea editar/eliminar ventas de ese día** y nuevas ventas (409).

## Migración de esquema (importante)

`create_all` **no altera tablas existentes**. Al agregar una columna a un modelo, regístrala también en `habilitar_columnas()` en `database.py` (lista `table_columns`) o las BD ya creadas no la tendrán. Las migraciones son idempotentes y corren al arrancar (`lifespan`).

- BD dev: `minimarket.db` en la raíz. Ejecutable empaquetado: `%APPDATA%\MinimarketDB` (ver `paths.py`). Override con `MINIMARKET_DATA_DIR`.
- Semilla demo: `python seed_data.py` (destructivo). Migración de datos reales: `python migrar_seed.py` / `migrar_smilla.py` (reemplazan datos).
- **Nunca subas `minimarket.db`, `minimarketmg.db`, `smilla.db`, `secret_key.txt`** al repo. Nota: `minimarket.db.bak_caja` **sí está trackeado** porque el patrón `*.db` de `.gitignore` no lo cubre; no crees backups con nombres que evadan el patrón.

## Tests

- `test_main.py` es el único archivo de tests; usa SQLite en memoria con `StaticPool` y sobreescribe `get_db`, más una autouse fixture que recrea tablas por test.
- Los usuarios se crean directamente en la BD (el CRUD de usuarios es solo admin) vía helpers `_crear_usuario_db` / `_login`.
- Las ventas a crédito crean una cuenta `pendiente`; editar la venta sincroniza la cuenta.

## Gotchas verificados

- El CI `frontend/.github/workflows/react-doctor.yml` está **dentro de `frontend/`**, no en `.github/` de la raíz, por lo que GitHub Actions no lo ejecuta.
- `packaging/build.ps1` referencia `packaging/MinimarketDB.spec`, que no existe (y `*.spec` está gitignored). El build de PyInstaller no funciona tal cual.
- `check_db.py` tiene una ruta hardcodeada ajena (`C:\Users\MERCEDES\...`); no es utilizable sin editar.
- `POST /api/admin/limpiar-datos` (`routers/mantenimiento.py`) **borra todos los datos operativos** y se protege con una clave fija en el código (`19674244`), no en la BD. Consérvala al refactorizar.
- Componentes sin uso: `CuentasPorCobrar.jsx` y `VentaCredito.jsx` no están importados en ninguna parte.
- `frontend/src/components/Ventas.jsx` y `Creditos.jsx` son muy grandes (cientos de KB); edítalos con cuidado.
- Commits y documentación en español.
