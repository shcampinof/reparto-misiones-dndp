# Mesa de Atencion Investigativa (React + Express)

Proyecto dividido en:

- `backend`: API Express con autenticacion, seleccion de cuenta y datos base del portal.
- `frontend`: SPA React con login (segun mockup), seleccion de cuenta y portal por rol.

## Requisitos

- Node.js 18+

## Ejecucion

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

API en `http://localhost:4000`.

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

App en `http://localhost:5173`.

## Publicacion en GitHub Pages

El workflow `.github/workflows/deploy-pages.yml` compila y publica automaticamente
el frontend cuando se envian cambios a la rama `main`. El frontend usa rutas con
hash para funcionar correctamente dentro de la URL de un repositorio de GitHub Pages.

En GitHub, abre `Settings > Pages` y selecciona `GitHub Actions` como fuente.

GitHub Pages solo aloja el frontend estatico. Para que el inicio de sesion y las
demas funciones operen en Internet, publica el backend en un servicio compatible
con Node.js y crea en el repositorio la variable `VITE_API_URL` con la URL publica
de la API, incluido el sufijo `/api`.

## Usuarios demo

- `admin / admin` (administrador, configurable por `.env`)
- `user / user` (usuario demo, por defecto defensor, configurable por `.env`)
- `1010101010 / Defensoria2026*` (cuentas coordinador e investigador)
- `scampino / Scampino2026*` (investigador)
- `1234567890 / Defensor2026*` (cuenta defensor)
- `2002002000 / Regional2026*` (defensor regional)
- `3003003000 / Pag2026*` (PAG)
- `4004004000 / Delegado2026*` (administrativo delegado)
- `5005005000 / Unidad2026*` (PAG unidad operativa)

## Configuracion de accesos por `.env`

El backend carga variables desde `.env` en la raiz del proyecto o desde `backend/.env`.
Usa `.env.example` como plantilla.

Variables principales:

- `ENABLE_DEMO_ACCOUNTS=true`: habilita las cuentas demo del prototipo.
- `ENABLE_ROLE_ADMINISTRADOR=true`
- `ENABLE_ROLE_COORDINADOR=true`
- `ENABLE_ROLE_PAG=true`
- `ENABLE_ROLE_ADMINISTRATIVO_DELEGADO=true`
- `ENABLE_ROLE_DEFENSOR=true`
- `ENABLE_ROLE_INVESTIGADOR=true`
- `ENABLE_ROLE_DEFENSOR_REGIONAL=true`
- `ENABLE_ROLE_PAG_UNIDAD_OPERATIVA=true`

Si una variable de rol queda en `false`, las cuentas de ese rol no aparecen en seleccion de cuenta y no pueden operar.
