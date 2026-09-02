# Guía de demostración SIGIP-DP

## Preparación

Abra `http://localhost:5173`. Confirme que la franja superior diga **“Ambiente de demostración — datos no reales”**. Todas las identidades, solicitudes, víctimas y referencias visibles son sintéticas. Si una ejecución anterior dejó cambios, ingrese como **Alex Demo — Administrador** y use **Restablecer datos de demostración**.

## Recorrido sugerido (máximo 8 minutos)

| Tiempo | Usuario / rol | Acción | Resultado esperado | Mensaje clave |
|---:|---|---|---|---|
| 0:00–0:35 | Pantalla inicial | Mostrar el nombre institucional y alternar Investigación / Víctimas. | Las cuentas disponibles cambian por área y el banner permanece visible. | Una plataforma común conserva dos procesos diferenciados. |
| 0:35–1:30 | Diana Demo / Defensor | Entrar en Investigación, radicar el SPOA sintético precargado y pulsar **Ejecutar reparto backend**. | La solicitud pasa de `RADICADA` a `ASIGNADA`; se muestran responsable, plazo y explicación. | El cliente no selecciona investigador: el backend evalúa especialidad, cobertura, disponibilidad y carga. |
| 1:30–2:35 | Iván Demo / Investigador | Cerrar sesión, ingresar como Investigador, iniciar misión, guardar avance y entregar `INF-DEMO-...`. | Solo aparece la misión propia; queda en `INFORME_ENTREGADO`. | La autorización filtra por asignación y cada acción persiste en la línea de tiempo. |
| 2:35–3:15 | Paula Demo / PAG Investigación | Ingresar y aprobar la entrega. | La misión cambia a `CERRADA`. | Investigación requiere aprobación técnica final del PAG. |
| 3:15–4:15 | Renata Demo / RJV | Volver, elegir Víctimas y crear el peritaje psicológico sintético con dos víctimas. | Se generan alias, nunca nombres, y el estado es `PENDIENTE_APROBACION_PAG`. | Víctimas exige aprobación previa y el RJV no puede escoger perito. |
| 4:15–5:10 | Samuel Demo / PAG/supervisor Víctimas | Ingresar y pulsar **Aprobar y repartir en backend**. | Aparecen `APROBADA_REPARTO` y luego `ASIGNADA`, con candidatos y exclusiones por disciplina, territorio, ley, disponibilidad y carga. | La estrategia de Víctimas es independiente y no aplica un límite fijo de seis. |
| 5:10–6:20 | Pilar Demo / Perito psicología | Ingresar, iniciar peritaje, registrar avance y finalizar con `F171-DEMO-...`. | El peritaje pasa directamente a `CERRADA`. | La entrega ordinaria del F-171 no hereda una aprobación final del PAG. |
| 6:20–7:20 | Alex Demo / Administrador | Alternar tableros, mostrar estados, responsables, carga, plazo y cronología; pulsar restablecer si se desea. | Las semillas regresan a su estado original de forma reproducible. | La demo tiene operaciones reales en backend y un reinicio controlado. |
| 7:20–8:00 | Cierre | Mostrar el pie de limitaciones y la versión de política demo. | Se distingue explícitamente la demo de una solución productiva. | Las decisiones pendientes están parametrizadas y rotuladas, no convertidas en reglas institucionales. |

## Cuentas precargadas

No usan contraseña; se seleccionan desde la pantalla inicial.

| Área | Identidad sintética | Rol |
|---|---|---|
| Ambas | Alex Demo | Administrador |
| Investigación | Diana Demo | Defensor/a |
| Investigación | Iván Demo | Investigador/a |
| Investigación | Paula Demo | PAG Investigación |
| Víctimas | Renata Demo | Representante judicial de víctimas (RJV) |
| Víctimas | Samuel Demo | PAG / Supervisor Víctimas |
| Víctimas | Pilar Demo | Perito psicología |
| Víctimas | Fabio Demo | Perito administrativo/financiero |

## Limitaciones que deben explicarse

- Es una demo de reunión, no el MVP productivo ni un ambiente institucional.
- El repositorio temporal vive en memoria durante la ejecución. Al reiniciar la API o restablecer la demo se recuperan semillas reproducibles.
- Plazos, catálogos, coberturas y desempates pendientes están identificados como **valores de demostración**; deben validarse antes de producción.
- No hay Oracle, SharePoint, AD/Entra ID, correo real, migración histórica ni interoperabilidad institucional.
- No se incluyen datos reales, credenciales reales ni archivos documentales.
- La futura persistencia Oracle debe sustituir la interfaz de repositorio sin trasladar lógica de negocio al frontend.
