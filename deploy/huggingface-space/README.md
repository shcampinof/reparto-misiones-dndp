---
title: SIGIP-DP
sdk: docker
app_port: 7860
pinned: false
---

# SIGIP-DP

Sistema de Información para la Gestión Investigativa y Pericial de la Defensoría del Pueblo.

El acceso está restringido a perfiles autorizados para la presentación institucional. La información inicial está preparada exclusivamente para recorrer las funciones habilitadas.

Incluye recorridos separados para Investigación y Víctimas. La asignación se calcula en el servidor y conserva una explicación resumida de candidatos, exclusiones, carga y motivo de selección.

## Configuración del Space

El repositorio debe permanecer **privado**. Requiere el Secret `JWT_SECRET`, configurado en los ajustes del Space y nunca almacenado en archivos. La aplicación escucha en el puerto `7860`.

La información inicial se reconstruye cuando inicia el contenedor y puede restablecerse desde el perfil **Administrador del sistema**.
