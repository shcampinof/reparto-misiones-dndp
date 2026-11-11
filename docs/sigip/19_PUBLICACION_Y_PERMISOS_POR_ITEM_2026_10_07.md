# Publicación de permisos por ítem para la demostración

Fecha: 7 de octubre de 2026, Colombia.

Se publicó en el Space canónico `shcampinof/reparto-misiones-dndp` el commit **316bc70e283a25167d522f7650aae5bb559ce6ef**. El publicador confirmó `RUNNING` y que el SHA activo corresponde al commit subido. Referencia anterior del Space: `5b680a7fbfda5734e99dca7d6f4c084485a15e85`.

## Cambio funcional

La autorización se aplica al JSON completo de bootstrap y respuestas de acciones: ítems, versiones, revisiones y snapshots. El perito recibe exclusivamente información aprobada aplicable a su encargo; no recibe campos comunes actuales ni correcciones de otro ítem. Los snapshots de cada encargo incluyen sólo ese ítem. Solicitantes y supervisores conservan su consulta autorizada. Se mantiene el estado agregado real de la solicitud.

Fuente: RN-COM-003/005 (D), RN-COM-016/022 (C), RN-VIC-020/021 (C) y autorización del usuario para corregir y publicar. El núcleo común controla la proyección; Víctimas añade la restricción a versión aprobada. No cambia la secuencia de estados ni habilita excepciones.

Actualización posterior de F-171 e improcedencia tienen contratos exclusivos de Víctimas y permanecen bloqueados por decisiones identificadas. Las reglas documentadas se alinearon con los estados ejecutables, el inventario actualizado de fuentes y la agenda de aprobación. No se inventaron responsables institucionales, plazos o aprobaciones.

## Archivos y módulos

- `core/auth/request-projection.js`: proyección común de consultas por ítem.
- `core/auth/capabilities.js` y `core/operations/contracts.js`: contrato bloqueado de improcedencia y área exclusiva del F-171.
- `modules/demo/service.js`: misma proyección para consultas y respuestas de acciones.
- `backend/test/api/app.test.js`: pruebas de ausencia de información ajena, acciones denegadas sin mutación, regionales y vigencias.
- `deploy/huggingface-space/publish-space.py`: confirma SHA activo y protege la publicación frente a cambios remotos concurrentes.
- `deploy/huggingface-space/test_publish_space.py` y `smoke-test.ps1`: verificación de publicación y permisos en el entorno remoto.
- Documentación: reglas, contrato pre-Oracle, HU, registro de decisiones, LEEME y guía de demostración.
- Se publicaron también las mejoras preexistentes de PortalPage, estilos y presentación de versión aprobada, con sus pruebas existentes.

No se crearon migraciones ni se integró Oracle. No se hizo push al repositorio GitHub; la publicación fue el paquete saneado de la versión local en Hugging Face. Los cambios locales permanecen disponibles para revisión.

## Verificación

| Comprobación | Resultado |
|---|---|
| Backend lint, formato y tests | Aprobados; 36 tests |
| Frontend lint, formato y build | Aprobados |
| Playwright escritorio y móvil | 10 tests aprobados |
| Publicador | 2 tests aprobados; no acepta una revisión anterior como despliegue terminado |
| Space salud, readiness, raíz y ruta interna | Correctos; HTTP 200 |
| Investigación remota | Asignación, problema sin cambiar estado, entrega y aprobación PAG hasta cierre |
| Víctimas remota | Devolución, corrección versionada, aprobación, reparto y cierre directo con F-171 |
| Permisos remotos | Corrección ajena no aprobada ausente en bootstrap y respuesta de acción; acceso al otro ítem denegado |
| Administrador técnico remoto | Decisiones operativas denegadas |
| Información de presentación al finalizar | Restablecidas las 6 solicitudes ficticias iniciales |

El paquete publicado contiene 50 archivos de ejecución. Se verificó ausencia de archivos `.env`, DOCX, PDF, XLSX y MP4. Documentos fuente, material de análisis y pruebas no se publicaron. Los datos ficticios de los formularios y las semillas se conservaron.

## Pendientes y uso

Las decisiones de RACI, plazos/calendarios, turno/carga, grado, coberturas, gobierno de catálogos y operaciones especiales siguen pendientes de evidencia institucional. El registro central identifica fuentes, comportamiento bloqueado, prioridad y funciones a convocar.

La demostración continúa en memoria; reinicios o restablecimientos reconstruyen los datos. No ofrece persistencia ni seguridad institucional de producción. Para presentar, use `11_GUIA_DE_DEMOSTRACION.md`; no requiere nueva configuración manual. El restablecimiento ya se efectuó y afecta todos los visitantes del Space.
