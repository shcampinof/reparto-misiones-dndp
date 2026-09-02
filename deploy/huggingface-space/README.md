---
title: SIGIP-DP Demo
emoji: 🛡️
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# SIGIP-DP Demo

Demostración funcional con datos exclusivamente sintéticos del Sistema de Información para la Gestión Investigativa y Pericial de la Defensoría del Pueblo.

> **Ambiente de demostración — datos no reales.** No es un ambiente productivo ni contiene información institucional, expedientes, víctimas, documentos o credenciales reales.

Incluye recorridos separados para Investigación y Víctimas. El reparto se calcula en el backend y conserva una explicación resumida de candidatos, exclusiones, carga y motivo de selección.

## Configuración del Space

El repositorio debe permanecer **privado**. Requiere el Secret `JWT_SECRET`, configurado en los ajustes del Space y nunca almacenado en archivos. La aplicación escucha en el puerto `7860`.

El almacenamiento es temporal: los datos sintéticos se reconstruyen automáticamente cuando inicia el contenedor y también pueden restablecerse desde la cuenta administrativa de demostración.
