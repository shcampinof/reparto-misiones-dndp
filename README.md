# SIGIP-DP

Preparación de Oracle Linux y adaptador Oracle de desarrollo: [guía 36](docs/sigip/36_ENTORNO_LINUX_Y_ADAPTADOR_ORACLE.md). Incluye instalación, servicio systemd de usuario, `.env.oracle.example`, migraciones, transacciones asíncronas y activación sin perder la configuración anterior. La conexión real sigue pendiente de listener/credenciales y pruebas contra el esquema institucional.

Demostración funcional del **Sistema de Información para la Gestión Investigativa y Pericial de la Defensoría del Pueblo**. Conserva estrategias y estados separados para Investigación y Víctimas sobre un monolito modular React + Express.

- Repositorio canónico: `https://github.com/shcampinof/reparto-misiones-dndp`
- Space canónico: `https://huggingface.co/spaces/shcampinof/reparto-misiones-dndp`
- Aplicación desplegada: `https://shcampinof-reparto-misiones-dndp.hf.space`

> Entorno público de pruebas funcionales: utiliza únicamente identidades y referencias ficticias. Nunca debe contener datos personales reales, documentos institucionales, secretos ni conexión Oracle. SQLite conserva operaciones y archivos mientras se mantenga su disco; el disco ordinario de Hugging Face es efímero frente a reemplazos del contenedor.

## Mejoras autónomas sin acceso institucional

[Incremento 33](docs/sigip/33_MEJORAS_AUTONOMAS_HUGGING_FACE.md): documentos por encargo con historial y reintento, corrección de adjuntos de Víctimas, borradores privados en servidor, filtros combinados, constancias imprimibles, avisos leídos y estado técnico. Docker admite PDF de 10 MB y hasta 30 MB en radicación; los límites son configurables. Incluye copias SQLite verificadas y restauración por CLI. Sin volumen duradero, base y copias locales siguen siendo efímeras. Antivirus: adaptador ClamAV opcional, sin motor activo por defecto.

## Ejecución local

Requiere Node.js 24.11 y npm, también fijado en Docker. Usa `node:sqlite` sin dependencias nativas adicionales.

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

La pantalla inicial ofrece acceso directo, sin contraseñas, a perfiles de presentación. Investigación incluye Administrador, Defensor, Investigador, PAG Investigación, Gestor Operativo Regional, Gestor Central de Excepciones y Defensor Regional; Víctimas incluye RJV, PAG/supervisor y peritos psicológico y financiero. Con la configuración provisional, el gestor regional decide prórrogas de su regional y el PAG recibe actividades derivadas. El administrador técnico consulta sin adoptar decisiones operativas; el restablecimiento se deshabilita al usar SQLite.

En desarrollo, las cuentas de presentación se habilitan con `ENABLE_DEMO_ACCOUNTS=true`; el Space usa `DEMO_MODE=true`. No se publican credenciales.

## Servicio local con PM2

Desde la raíz del repositorio, con Node.js 24.11 y las dependencias del backend y frontend instaladas:

```powershell
npm.cmd --prefix deploy/local ci
npm.cmd --prefix frontend run build
.\deploy\local\service.ps1 start
.\deploy\local\service.ps1 save
```

Interfaz y API se sirven juntas en `http://localhost:4000`; salud en `http://localhost:4000/api/health` y persistencia en `http://localhost:4000/api/ready`. PM2 ejecuta una sola instancia con SQLite y reinicia el servicio si falla, sin restablecer los datos al arrancar. Se conserva la configuración local de `.env` y se habilitan perfiles sintéticos para visualización local. La configuración escucha únicamente en este equipo.

Administración: `.\deploy\local\service.ps1 status`, `logs`, `restart` o `stop`. Después de cambiar la interfaz, vuelva a compilar y reinicie. PM2 guarda sus registros y estado en `tmp/pm2-sigip/`, excluido de Git. Después de reiniciar Windows, ejecute `.\deploy\local\service.ps1 resurrect`; no se instala arranque automático de Windows.

La configuración PM2 permite los orígenes locales de los puertos 4000 y 5173. Para comprobar también las cabeceras `Origin` que usa el navegador al cargar JavaScript y CSS, ejecute `node deploy/local/smoke-check.mjs` con el servicio activo. Esta verificación incluye ambos nombres locales, perfiles de ambas áreas, persistencia y rechazo de orígenes externos.

## Verificación

Actualización del 16-oct-2026: [funcionamiento persistente y políticas provisionales](docs/sigip/30_INCREMENTO_FUNCIONAL_PERSISTENTE_2026_10_16.md). Incluye prórrogas independientes por área, remisión regional, continuaciones de Víctimas al mismo perito, archivos de solicitud descargables, idempotencia y conservación del historial. Estas decisiones de implementación fueron autorizadas por el usuario y no se presentan como aprobación institucional. Los avisos quedan en bandeja; correo e IRIS siguen sin conexión institucional.

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
npx playwright test --config playwright.functional.config.js
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
  infrastructure/persistence/  SQLite transaccional, migraciones e índices de dominio
  modules/core/                 identidad, autorización y salud
  modules/investigacion/        frontera del flujo investigativo
  modules/victimas/             frontera del flujo pericial
  modules/assignment/strategies estrategias separadas de reparto
  modules/demo/                 caso de uso integrado para la presentación
frontend/src/                   acceso por roles, tableros, acciones y trazabilidad
```

Cada reparto registra candidatos, exclusiones, métricas y motivo. El cliente nunca envía el funcionario seleccionado. Si no existe una regla vigente de plazo, la interfaz omite días restantes, semáforo y oportunidad, y el catálogo indica que el plazo es parametrizable por servicio.

## Límites

- SQLite usa WAL, escritura serializada y rollback. Dos migraciones reproducibles conservan casos, solicitudes, ítems, asignaciones, personas por versión, documentos, outbox y auditoría. El agregado JSON de compatibilidad todavía requiere descomposición para el modelo Oracle.
- Los plazos no se presentan como aprobados mientras no exista una regla vigente aplicable.
- Oracle, SharePoint, AD/Entra ID, correo, migración histórica y datos institucionales no están habilitados.
- La instancia en servidor será el entorno institucional; el Space público no debe tratarse como ambiente productivo.

La [guía de pruebas e integración](docs/sigip/32_GUIA_ENTORNO_PRUEBAS_Y_TRANSICION_ORACLE.md) explica configuración, copias de seguridad, límites y separación de identidad institucional. La [solicitud al área funcional](docs/sigip/31_SOLICITUD_RATIFICACION_AREA_FUNCIONAL.md) está redactada y no se ha enviado.

Consulte [la guía de demostración](docs/sigip/11_GUIA_DE_DEMOSTRACION.md), [la línea base técnica](docs/sigip/08_LINEA_BASE_TECNICA.md), [la base de ingeniería](docs/sigip/08A_BASE_INGENIERIA_IMPLEMENTADA.md) y [las brechas funcionales/RACI](docs/sigip/14_BRECHAS_FUNCIONALES_Y_RACI.md).
