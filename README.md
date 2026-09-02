# SIGIP-DP

Demostración funcional del **Sistema de Información para la Gestión Investigativa y Pericial de la Defensoría del Pueblo**. Conserva estrategias y estados separados para Investigación y Víctimas sobre un monolito modular React + Express.

> Ambiente de demostración: utiliza únicamente personas, solicitudes, referencias y documentos sintéticos. El almacén temporal en memoria no es la persistencia productiva prevista.

## Ejecución local

Requiere Node.js 20 LTS recomendado (mínimo 18) y npm.

```powershell
Copy-Item .env.demo.example .env
cd backend
npm ci
npm start
```

En otra terminal:

```powershell
cd frontend
npm ci
npm run dev
```

- Aplicación: `http://localhost:5173`
- API: `http://localhost:4000`
- Salud: `http://localhost:4000/api/health`

La pantalla inicial ofrece acceso directo, sin contraseñas, a cuentas exclusivamente sintéticas. Investigación incluye Defensor, Investigador y PAG; Víctimas incluye RJV, PAG/supervisor y peritos psicológico y financiero. La cuenta `Alex Demo` habilita el restablecimiento administrativo.

El modo demo se habilita de forma explícita con `ENABLE_DEMO_ACCOUNTS=true` y está prohibido por configuración en producción. No se requieren ni se publican credenciales.

## Verificación

```powershell
cd backend
npm run lint
npm run format:check
npm test

cd ..\frontend
npm run lint
npm run format:check
npm run build
```

Las pruebas API recorren ambos flujos completos, autorización por asignación, reparto exclusivo del backend, diferencias de aprobación y restablecimiento reproducible.

## Arquitectura de la demo

```text
backend/src/
  app/                         composición HTTP
  infrastructure/demo/         semillas y repositorio temporal sustituible
  modules/core/                 identidad, autorización y salud
  modules/investigacion/        frontera del flujo investigativo
  modules/victimas/             frontera del flujo pericial
  modules/assignment/strategies estrategias separadas de reparto
  modules/demo/                 caso de uso integrado para la presentación
frontend/src/                   acceso por roles, tableros, acciones y trazabilidad
```

Las decisiones pendientes usan parámetros rotulados como `Valores de demostración` y una versión de política. Cada reparto registra candidatos, exclusiones, métricas y motivo. El cliente nunca envía el funcionario seleccionado.

## Límites

- El almacén vive durante la ejecución, se repone al reiniciar y puede restablecerse desde la interfaz.
- Los plazos usan días calendario exclusivamente para la demostración; no representan una regla aprobada.
- Oracle, SharePoint, AD/Entra ID, correo, migración histórica y datos institucionales no están habilitados.
- No debe exponerse esta configuración como ambiente productivo.

Consulte [la guía de demostración](docs/sigip/11_GUIA_DE_DEMOSTRACION.md), [la línea base técnica](docs/sigip/08_LINEA_BASE_TECNICA.md) y [la base de ingeniería](docs/sigip/08A_BASE_INGENIERIA_IMPLEMENTADA.md).
