# Guía de demostración SIGIP-DP

## Preparación

Abra `http://localhost:5173` o la URL privada vigente del Space. Confirme que se muestren el logo oficial, las pestañas **Investigación / Víctimas** y el selector **Perfil de acceso**. Si una ejecución anterior dejó cambios, ingrese como **Administrador del sistema** y use **Restablecer información inicial**.

### Nuevo acceso por contexto

1. Seleccione **Investigación** o **Víctimas** en las pestañas horizontales.
2. Elija en **Perfil de acceso** uno de los perfiles filtrados para esa área.
3. Pulse **Ingresar al portal**. El selector facilita el guion, pero la cuenta autenticada y el backend siguen determinando los permisos y módulos habilitados.
4. Use **Cerrar sesión** en la cabecera para regresar y cambiar de perfil.

La interfaz usa el logo PNG oficial suministrado. Continúan pendientes una variante horizontal o vectorial autorizada y los archivos web licenciados de Geomanist.

## Recorrido sugerido (máximo 8 minutos)

| Tiempo | Usuario / rol | Acción | Resultado esperado | Mensaje clave |
|---:|---|---|---|---|
| 0:00–0:30 | Pantalla inicial | Alternar **Investigación** / **Víctimas** y mostrar el selector de rol. | Los perfiles cambian por área y el aviso de datos no reales permanece visible. | Una plataforma común conserva autorización y procesos separados. |
| 0:30–1:25 | Defensor/a solicitante | Entrar en Investigación, radicar el SPOA precargado y pulsar **Validar y ejecutar reparto**. | La validación y el reparto ocurren en el servidor; el caso pasa de `RADICADA` a `ASIGNADA`. | El usuario no selecciona investigador. El servidor conserva candidatos, exclusiones, carga y desempate. |
| 1:25–2:20 | Investigador/a de campo 01 | Abrir **Pendientes**, iniciar la misión recién asignada, registrar avance y entregar `INF-2026-...`. | El stepper avanza hasta `INFORME_ENTREGADO`; solo se ven encargos propios y acciones válidas. | Cada acción se registra en el servidor y queda en el historial. |
| 2:20–3:05 | PAG Investigación | Abrir **Por revisar**, entrar al detalle y mostrar **Devolver informe** / **Aprobar y cerrar**. Aprobar la entrega del recorrido. | La misión queda `CERRADA`; la devolución, si se presenta, exige observación y regresa a ejecución sin borrar la referencia entregada. | Investigación requiere revisión técnica final del PAG. |
| 3:05–4:00 | Representante judicial de víctimas | Elegir Víctimas y crear el peritaje psicológico con dos personas vinculadas. | Queda `PENDIENTE_APROBACION_PAG`; no existe selector de perito. | Víctimas aprueba antes del reparto y minimiza los datos personales presentados. |
| 4:00–4:55 | PAG Víctimas | Abrir **Pendientes** y pulsar **Aprobar y repartir**. | Se registran aprobación previa y asignación automática, con explicación de elegibilidad separada para Víctimas. | No se heredan filtros ni límites fijos de Investigación. |
| 4:55–5:55 | Perito Psicología 01 | Abrir **Pendientes**, iniciar, registrar avance y finalizar con `F171-2026-...`. | El servicio pasa a `CERRADA` y la referencia del F-171 aparece en detalle. | La entrega ordinaria de Víctimas cierra sin aprobación final PAG. |
| 5:55–7:15 | Administrador del sistema | Alternar áreas y bandejas; abrir el panel lateral para mostrar solicitante, responsable, fecha estimada, semáforo, documentos e historial. | Se observan hasta tres casos por área en etapas diferentes. | Fechas estimadas y semáforo están marcados como pendientes de validación funcional. |
| 7:15–8:00 | Administrador del sistema | Pulsar **Restablecer información inicial** y cerrar con las limitaciones. | Regresan seis casos reproducibles, tres por área. | Es una presentación funcional; no corresponde a una implementación productiva. |

## Cuentas precargadas

No usan contraseña; se seleccionan desde la pantalla inicial.

| Área | Perfil de acceso | Rol |
|---|---|---|
| Ambas | Administrador del sistema | Administrador |
| Investigación | Defensor/a solicitante | Defensor/a |
| Investigación | Investigador/a de campo 01 | Investigador/a |
| Investigación | PAG Investigación | PAG Investigación |
| Víctimas | Representante judicial de víctimas | RJV |
| Víctimas | PAG Víctimas | PAG / Supervisor Víctimas |
| Víctimas | Perito Psicología 01 | Perito psicología |
| Víctimas | Perito Financiero 01 | Perito administrativo/financiero |

## Limitaciones que deben explicarse

- Es una demo de reunión, no el MVP productivo ni un ambiente institucional.
- El repositorio temporal vive en memoria durante la ejecución. Al reiniciar la API o restablecer la demo se recuperan semillas reproducibles.
- Plazos, catálogos, coberturas y desempates pendientes están identificados como **valores de demostración**; deben validarse antes de producción.
- No hay Oracle, SharePoint, AD/Entra ID, correo real, migración histórica ni interoperabilidad institucional.
- No se incluyen datos reales, credenciales reales ni archivos documentales.
- La futura persistencia Oracle debe sustituir la interfaz de repositorio sin trasladar lógica de negocio al frontend.
