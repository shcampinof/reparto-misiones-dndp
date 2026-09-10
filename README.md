# SIGIP-DP

Demostración funcional del **Sistema de Información para la Gestión Investigativa y Pericial de la Defensoría del Pueblo**. Conserva estrategias y estados separados para Investigación y Víctimas sobre un monolito modular React + Express.

- Repositorio canónico: `https://github.com/shcampinof/reparto-misiones-dndp`
- Space canónico: `https://huggingface.co/spaces/shcampinof/reparto-misiones-dndp`
- Aplicación desplegada: `https://shcampinof-reparto-misiones-dndp.hf.space`

> Entorno público de presentación: utiliza únicamente identidades y referencias ficticias. Nunca debe contener datos personales reales, documentos institucionales, secretos ni conexión Oracle. El almacén en memoria no es la persistencia productiva prevista.

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

La pantalla inicial ofrece acceso directo, sin contraseñas, a perfiles de presentación. Investigación incluye Administrador, Defensor, Investigador, PAG Investigación, Gestor Operativo Regional, Gestor Central de Excepciones y Defensor Regional; Víctimas incluye RJV, PAG/supervisor y peritos psicológico y financiero. Los tres perfiles adicionales de Investigación tienen navegación consultiva conservadora; no reciben actuaciones sujetas a RACI. El perfil `Administrador del sistema` conserva consulta global, gestión técnica y restablecimiento, pero no adopta decisiones operativas.

En desarrollo, las cuentas de presentación se habilitan con `ENABLE_DEMO_ACCOUNTS=true`; el Space usa `DEMO_MODE=true`. No se publican credenciales.

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
npm run test:browser
```

Las pruebas API y de navegador recorren ambos flujos completos, asistentes de radicación, personas múltiples, devolución/corrección/reenvío en Víctimas, autorización por área/región/titularidad, reparto automático por hito, restricción operativa de perfiles consultivos y restablecimiento reproducible.

## Despliegue vigente

- La versión funcional se publica en el Space Docker canónico: `https://shcampinof-reparto-misiones-dndp.hf.space`.
- GitHub Pages queda como alternativa manual para el frontend. Requiere configurar `VITE_API_URL` con una API pública HTTPS operativa; no se activa automáticamente al actualizar `main`.

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

Cada reparto registra candidatos, exclusiones, métricas y motivo. El cliente nunca envía el funcionario seleccionado. Si no existe una regla vigente de plazo, la interfaz omite días restantes, semáforo y oportunidad, y el catálogo indica que el plazo es parametrizable por servicio.

## Límites

- El almacén vive durante la ejecución, se repone al reiniciar y puede restablecerse desde la interfaz.
- Los plazos no se presentan como aprobados mientras no exista una regla vigente aplicable.
- Oracle, SharePoint, AD/Entra ID, correo, migración histórica y datos institucionales no están habilitados.
- La instancia en servidor será el entorno institucional; el Space público no debe tratarse como ambiente productivo.

Consulte [la guía de demostración](docs/sigip/11_GUIA_DE_DEMOSTRACION.md), [la línea base técnica](docs/sigip/08_LINEA_BASE_TECNICA.md), [la base de ingeniería](docs/sigip/08A_BASE_INGENIERIA_IMPLEMENTADA.md) y [las brechas funcionales/RACI](docs/sigip/14_BRECHAS_FUNCIONALES_Y_RACI.md).
