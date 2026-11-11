---
title: SIGIP-DP
sdk: docker
app_port: 7860
pinned: false
---

# SIGIP-DP

Sistema de Información para la Gestión Investigativa y Pericial de la Defensoría del Pueblo.

Space canónico: `https://huggingface.co/spaces/shcampinof/reparto-misiones-dndp`  
Aplicación: `https://shcampinof-reparto-misiones-dndp.hf.space`

El Space es público y está destinado exclusivamente a presentación. La información inicial está preparada para recorrer las funciones habilitadas sin datos personales reales ni documentos institucionales.

Incluye recorridos separados para Investigación y Víctimas. La asignación se calcula en el servidor y conserva una explicación resumida de candidatos, exclusiones, carga y motivo de selección.

Actualización funcional: SQLite transaccional, radicación idempotente, PDF de solicitud y productos descargables con acceso autorizado y versiones conservadas. Investigación incorpora prórroga ordinaria decidida por gestor regional y remisión directa a regional receptora con reparto automático. Víctimas conserva aprobación previa y cierre F171; permite continuaciones con nuevas personas/actualización al mismo perito y prórrogas decididas por PAG. Los términos son políticas provisionales de pruebas, pendientes de ratificación institucional, diferenciadas por área. No se envía correo real ni existe conexión activa con IRIS.

## Configuración del Space

El Space puede permanecer **público** para presentación. Requiere el Secret `JWT_SECRET`, configurado en los ajustes del Space y nunca almacenado en archivos. No se permiten datos personales reales, documentos institucionales, otros secretos ni conexión Oracle. La aplicación escucha en el puerto `7860`; la instancia en servidor será el entorno institucional.

La información se inicializa sólo cuando no existe la base SQLite y no se restablece desde el portal. Los datos se conservan mientras se mantenga el directorio del contenedor; el disco ordinario del Space es efímero y puede perderse al reconstruir/reemplazar el contenedor. No se habilitó almacenamiento adicional de pago. El servidor de pruebas institucional deberá usar un volumen persistente y la integración Oracle prevista.

## Documentos y recuperación

La entrega autónoma agrega borradores privados, soportes por encargo con versiones y motivo, progreso y reintento, filtros combinados y constancias HTML imprimibles. Los PDF de solicitud corregida conservan su versión anterior. Límites técnicos Docker: 10 MB por PDF, 30 MB acumulados en radicación y 50 MB de soportes por encargo incluyendo versiones. No hay antivirus activo por defecto: se muestra validación básica; existe un contrato opcional con clamscan local.

Las copias consistentes de SQLite se verifican al iniciar y cada seis horas, con tres copias locales de retención técnica. Administración puede solicitar una copia y consultar su estado. Base y respaldos en `/app/data` continúan siendo efímeros sin volumen duradero; no se contrató almacenamiento adicional. Las copias no se descargan por HTTP para preservar las restricciones de acceso documental. Se restauran mediante la utilidad CLI en una ruta nueva con el servicio detenido.
