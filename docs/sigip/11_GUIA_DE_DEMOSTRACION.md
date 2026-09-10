# Guía de demostración SIGIP-DP

## Preparación

Abra `http://localhost:5173` o `https://shcampinof-reparto-misiones-dndp.hf.space`. Confirme que se muestren el logo oficial, las pestañas **Investigación / Víctimas** y el selector **Perfil de acceso**. Si una ejecución anterior dejó cambios, ingrese como **Administrador del sistema** y use **Restablecer información inicial**.

### Nuevo acceso por contexto

1. Seleccione **Investigación** o **Víctimas** en las pestañas horizontales.
2. Elija en **Perfil de acceso** uno de los perfiles filtrados para esa área.
3. Pulse **Ingresar al portal**. El selector facilita el guion, pero la cuenta autenticada y el backend siguen determinando los permisos y módulos habilitados.
4. Use **Cerrar sesión** en la cabecera para regresar y cambiar de perfil.

La interfaz usa el logo PNG oficial suministrado. Continúan pendientes una variante horizontal o vectorial autorizada y los archivos web licenciados de Geomanist.

## Recorrido sugerido

| Tiempo | Usuario / rol | Acción | Resultado esperado | Mensaje clave |
|---:|---|---|---|---|
| 0:00–0:30 | Pantalla inicial | Alternar **Investigación** / **Víctimas** y mostrar el selector de rol. | Los perfiles cambian por área. | Una plataforma común conserva autorización y procesos separados. |
| 0:30–1:25 | Defensor/a solicitante | Completar el asistente de Investigación: solicitante, personas, proceso, necesidad, servicios, documentos y confirmación. | Al radicar, cada ítem queda `ASIGNADA` o `PENDIENTE_EXCEPCION`. | El Defensor consulta el resultado; no ejecuta ni reintenta el reparto. |
| 1:25–2:20 | Investigador/a de campo 01 | Abrir **Pendientes**, iniciar la misión recién asignada, registrar avance y entregar `INF-2026-...`. | El stepper avanza hasta `INFORME_ENTREGADO`; solo se ven encargos propios y acciones válidas. | Cada acción se registra en el servidor y queda en el historial. |
| 2:20–3:05 | PAG Investigación | Abrir **Por revisar**, entrar al detalle y mostrar **Devolver informe** / **Aprobar y cerrar**. Aprobar la entrega del recorrido. | La misión queda `CERRADA`; la devolución, si se presenta, exige observación y regresa a ejecución sin borrar la referencia entregada. | Investigación requiere revisión técnica final del PAG. |
| 3:05–4:00 | Representante judicial de víctimas | Completar el asistente con RJV en solo lectura, proceso, dos personas con relaciones/contacto, servicios, documentos y confirmación. | Queda `PENDIENTE_APROBACION_PAG`; no existe selector de perito. | Víctimas aprueba antes del reparto y usa únicamente información ficticia de presentación. |
| 4:00–4:55 | PAG Víctimas | Abrir **Pendientes**. Mostrar **Devolver solicitud**, con observación obligatoria, y luego **Aprobar solicitud**. | La devolución pasa a `DEVUELTA`; el RJV corrige y reenvía conservando la versión anterior. La aprobación dispara la asignación automática. | El PAG decide el aval, no selecciona manualmente al perito. |
| 4:55–5:55 | Perito Psicología 01 | Abrir **Pendientes**, iniciar, registrar avance y finalizar con `F171-2026-...`. | El servicio pasa a `CERRADA` y la referencia del F-171 aparece en detalle. | La entrega ordinaria de Víctimas cierra sin aprobación final PAG. |
| 5:55–6:45 | Gestor Operativo Regional | Abrir su bandeja regional y mostrar problemas e historial de correcciones. | Sólo consulta el alcance regional; no aparecen acciones operativas pendientes. | No aprueba informes ni administra reglas. |
| 6:45–7:20 | Gestor Central de Excepciones | Mostrar la cola nacional `PENDIENTE_EXCEPCION`, causales y candidatos excluidos. | No aparece reintento ni asignación manual. | La excepción requerirá RACI, causal, justificación y soporte aprobados. |
| 7:20–7:45 | Defensor Regional | Mostrar seguimiento territorial. | Sólo consulta solicitudes, cargas, productos e indicadores disponibles. | No reparte, corrige, aprueba ni cierra. |
| 7:45–8:30 | Administrador del sistema | Alternar áreas y bandejas; abrir el detalle y restablecer la información inicial. | Se observan casos de ambas áreas, sin botones operativos. | El rol técnico conserva consulta global, no decisiones operativas. |

## Cuentas precargadas

No usan contraseña; se seleccionan desde la pantalla inicial.

| Área | Perfil de acceso | Rol |
|---|---|---|
| Ambas | Administrador del sistema | Administrador |
| Investigación | Defensor/a solicitante | Defensor/a |
| Investigación | Investigador/a de campo 01 | Investigador/a |
| Investigación | PAG Investigación | PAG Investigación |
| Investigación | Gestor operativo regional Bogotá | Gestor operativo regional |
| Investigación | Gestor central de excepciones | Gestor central de excepciones |
| Investigación | Defensor regional Bogotá | Defensor regional de solo lectura |
| Víctimas | Representante judicial de víctimas | RJV |
| Víctimas | PAG Víctimas | PAG / Supervisor Víctimas |
| Víctimas | Perito Psicología 01 | Perito psicología |
| Víctimas | Perito Financiero 01 | Perito administrativo/financiero |

## Limitaciones que deben explicarse

- El Space es público y sirve sólo para presentación; no es el MVP productivo ni el entorno institucional.
- La información vive en memoria durante la ejecución y puede restablecerse.
- Cuando no existe plazo vigente, no se muestran métricas temporales y el catálogo indica que el plazo es parametrizable.
- No hay Oracle, SharePoint, AD/Entra ID, correo real, migración histórica ni interoperabilidad institucional.
- Nunca se incluyen datos personales reales, documentos institucionales, secretos ni conexión Oracle.
- La futura persistencia Oracle debe sustituir la interfaz de repositorio sin trasladar lógica de negocio al frontend.
