# Actuaciones y entrega documental — 7 de octubre de 2026

## Alcance y decisiones

Solicitud explícita del usuario: ampliar la actuación, hacer visible su registro y permitir entregar informe mediante URL de SharePoint o PDF, incluyendo documentos ficticios para presentación.

- **C/B, proceso existente:** Investigación entrega y pasa a revisión del PAG; devolución con observación vuelve a ejecución; aprobación cierra. Víctimas conserva aprobación previa al reparto y cierre directo ordinario con F-171. Fuentes: reglas consolidadas y contrato funcional pre-Oracle.
- **D, interacción autorizada para el demo:** formulario compartido admite referencia, URL HTTPS de un tenant SharePoint o PDF hasta 2 MB; el límite es técnico del prototipo, no una regla institucional.
- **D, integridad y autorización existentes:** cada entrega crea un producto versionado; la descarga requiere autorización de consulta sobre el mismo ítem y deja evento de consulta. Un reintento con mismo identificador y contenido devuelve la operación confirmada, sin duplicarla; un contenido distinto con el mismo identificador se rechaza.
- **P:** integración real SharePoint/SSO, almacenamiento institucional, análisis antimalware y aprobación del RACI siguen pendientes. Registrar enlace no crea, verifica ni concede acceso al archivo externo.

## Cambios

Backend: modules/demo/delivery.js, service.js y router.js. Validación del formato, contenido básico, tamaño, nombre, huella SHA-256 y rechazo de scripts evidentes; el contenido no aparece en bootstrap ni proyecciones. Ruta autenticada GET /api/demo/:area/items/:id/productos/:productId/documento. No se consultan URLs externas desde el servidor.

Frontend: PortalPage.jsx, api.js, demo-pdf.js y styles.css. Actuación en textarea de cinco filas con historial visible, confirmación cercana y deshabilitación de envíos vacíos. La confirmación global queda visible al desplazarse. Entrega por tres modos, selector de archivo y botón **Usar PDF de ejemplo**, que genera un PDF válido. Archivos de cada versión descargables y enlaces accesibles también para revisión.

Se conservan permisos, reparto, cobertura, especialidades, datos de presentación y dashboard implementados antes de esta revisión. Las operaciones pendientes no se habilitan.

## Verificación

Pruebas API: recorridos de ambas áreas, transiciones y autorización, PDF y URL inválidos, archivo superior al límite, acceso ajeno denegado, descarga idéntica, auditoría de consulta, reintentos, devolución y versiones anteriores conservadas. Pruebas de navegador: interacción por rol, actuación ampliada y visible después de recarga, rechazo de enlace con conservación del dato, carga y descarga PDF, devolución PAG y nueva versión con SharePoint. Se mantienen pruebas de catálogos/vigencia, concurrencia del reparto, territorios, snapshots por ítem y móviles.

Sin migraciones: se conserva persistencia en memoria del demo desechable. Los archivos existen durante la ejecución del Space; restablecer o reiniciar elimina las cargas nuevas. No usar información real. No hay motor de calendario nuevo ni cambios de términos pendientes.

Resultado final: 41/41 pruebas backend; 14 recorridos de navegador comprobados (13 de regresión y el nuevo recorrido documental; repetición focalizada exitosa de Investigación y Víctimas con PDF); lint y formato de ambos módulos; compilación frontend; 2 pruebas del publicador. PDF de ejemplo verificado con pypdf: una página legible. El primer intento del nuevo test tuvo un selector demasiado estricto por el contador del filtro; se corrigió el selector y pasó, sin modificación del flujo funcional.

Publicación: commit **82b45ee6b2769aa5915427d3185f0deeaa03a735**, estado **RUNNING** y SHA activo verificado. URL: https://huggingface.co/spaces/shcampinof/reparto-misiones-dndp. Smoke remoto exitoso: ambos flujos hasta cierre, PDF descargable, reintento idempotente y descarga de otro investigador denegada; permisos por ítem y dashboard conservados. Se restablecieron los **11 casos iniciales** al terminar.

Pasos manuales posteriores: recargar la página; cerrar sesión y volver a ingresar si se conserva una sesión anterior. Para el demo puede usar el PDF de ejemplo sin preparar archivos. No se requiere configuración adicional de SharePoint para guardar enlaces; abrir un archivo real exige sus permisos externos.

## Demostración

Investigador: **En ejecución → Descripción de la actuación → Registrar actuación**; mostrar registro en el historial. Después **Forma de entrega → Cargar PDF → Usar PDF de ejemplo → Entregar informe**. PAG: **Por revisar → Descargar PDF → Aprobar y cerrar**, o devolver con motivo y solicitar una nueva versión. Perito de Víctimas usa las mismas opciones documentales, con botón **Finalizar con F-171** y cierre directo.
