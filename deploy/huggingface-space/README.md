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

## Configuración del Space

El Space puede permanecer **público** para presentación. Requiere el Secret `JWT_SECRET`, configurado en los ajustes del Space y nunca almacenado en archivos. No se permiten datos personales reales, documentos institucionales, otros secretos ni conexión Oracle. La aplicación escucha en el puerto `7860`; la instancia en servidor será el entorno institucional.

La información inicial se reconstruye cuando inicia el contenedor y puede restablecerse desde el perfil **Administrador del sistema**.
