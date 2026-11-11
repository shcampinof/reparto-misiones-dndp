# Ajuste de interfaz y textos

Solicitud expresa del usuario: retirar referencias a entorno de pruebas de la interfaz, moderar tipografía/negritas/estilos y sustituir las ventanas laterales por una presentación más sobria, sin alterar sustancialmente el aplicativo. Autoriza también publicar en el Space canónico.

Decisión de presentación D, aplicada al núcleo visual compartido por Investigación y Víctimas. RN-COM-032: textos claros con nombres y tildes preservados. Se conservan permisos de servidor, reserva documental, estados y las decisiones C/B/D/P. Retirar una etiqueta visual no cambia el estado institucional de una política ni activa una integración. Las conexiones pendientes y la naturaleza del hosting se mantienen documentadas en los informes 30–34 y en el registro de decisiones.

## Alcance

- Retirar el aviso general de políticas provisionales y referencias a pruebas/presentación en pantallas y constancia descargable.
- Tipografía Arial, peso normal para contenido y énfasis limitado a encabezados/acciones; sin mayúsculas y espaciado decorativos.
- Superficies neutrales, bordes discretos, menos redondeados y sin sombras ornamentales, conservando azul y estados de validación.
- Detalle de caso centrado y amplio en escritorio, adaptado a móvil; conservar Escape, cierre, foco y navegación Resumen/Documentos.
- Simplificar textos operativos sin afirmar que correo, IRIS, SSO o antivirus están conectados.
- Retirar los atajos de generación de caso y PDF de ejemplo de las pantallas. La entrega usa el selector de archivos; las pruebas cargan sus propios PDF como fixtures.

Sin cambios de esquema o migraciones. Sin nuevas reglas de reparto, términos, autoridades o cierre. Las reglas pendientes conservan su trazabilidad y condición en documentación y servidor.

## Verificación y publicación

- Frontend: lint, formato y compilación correctos. Recorridos existentes: 23/23. Suite funcional persistente: 11/11, incluyendo nueva comprobación de presentación, centrado a 1440/768/360 px, navegación entre documentos, ciclo de foco, Escape y retorno al botón de apertura.
- Backend: lint y formato correctos; 92/92 pruebas. La prueba focal de constancia vuelve a pasar con una aserción que excluye etiquetas de pruebas/datos sintéticos. Se mantuvieron los controles de acceso.
- Se adaptaron dos entregas de F171 para cargar PDF desde el selector, y la segunda radicación consecutiva para capturar sus campos, al retirar los atajos de ejemplos. La primera ejecución detectó la dependencia del caso de ejemplo en esa prueba; corregida, la suite completa pasó.
- Inspección de capturas locales en escritorio y móvil: sin panel lateral ni desbordamiento horizontal; campos sin negrita heredada y fichas de detalle con separadores simples.
- Paquete de publicación: 87 archivos; 78 fuentes cotejadas por hash con el repositorio. Sin bases locales, secretos, documentos fuente ni archivos adjuntos de usuarios.
- Space publicado: [SIGIP-DP](https://shcampinof-reparto-misiones-dndp.hf.space). SHA activo confirmado por la API de Hugging Face: `eecfa88459f8957e027cc698082065786ef07f94`, estado `RUNNING`.
- Verificación sobre la publicación mediante navegador: `/api/ready` 200, Arial, CSS `index-CurRzW2A.css`, JS `index-d6DJPArg.js`, detalle de 1000 px centrado, móvil 360 px sin desbordamiento, regreso del foco al cerrar, constancia sin etiquetas de pruebas, acceso a Investigación y Víctimas y cero errores de ejecución de página. Sólo consultas; no se generaron expedientes ni documentos.

## Archivos y módulos

- Interfaz compartida: `frontend/src/styles.css`, `frontend/src/pages/LoginPage.jsx`, `frontend/src/pages/PortalPage.jsx`, `frontend/src/components/MaintenancePanel.jsx`.
- Constancias del núcleo: `backend/src/modules/core/workspace/service.js`.
- Verificación: `frontend/test/browser/flows.spec.js`, `frontend/test/browser/functional.spec.js`, `backend/test/api/workspace.test.js`.
- Trazabilidad: este informe, `docs/sigip/00_LEEME.md` y `docs/decisions/README.md`.

Migraciones: ninguna. Reglas de negocio modificadas: ninguna; sólo decisión D de presentación compartida, asociada a claridad de interfaz RN-COM-032. No cambia estados, plazos, aprobación, permisos, reserva F171 ni algoritmo de reparto.

Pendientes funcionales: conservan su condición y fuentes en los informes 30–34 y en la matriz de decisiones. No hay pasos manuales nuevos de configuración para este ajuste; la publicación quedó completada en el Space existente.
