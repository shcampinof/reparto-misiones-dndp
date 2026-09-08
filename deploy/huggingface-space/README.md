---
title: SIGIP-DP
sdk: docker
app_port: 7860
pinned: false
---

# SIGIP-DP — Sistema de Información para la Gestión Investigativa y Pericial de la Defensoría del Pueblo

Sistema de Información para la Gestión Investigativa y Pericial de la Defensoría del Pueblo.

Space canónico: `https://huggingface.co/spaces/shcampinof/reparto-misiones-dndp`  
Aplicación: `https://shcampinof-reparto-misiones-dndp.hf.space`

El acceso está restringido a perfiles autorizados para la presentación institucional. La información inicial está preparada exclusivamente para recorrer las funciones habilitadas.

Incluye recorridos separados para Investigación y Víctimas. La asignación se calcula en el servidor y conserva una explicación resumida de candidatos, exclusiones, carga y motivo de selección.

## Configuración del Space

El repositorio debe permanecer **privado**. Requiere el Secret `JWT_SECRET`, configurado en los ajustes del Space y nunca almacenado en archivos. La aplicación escucha en el puerto `7860`.

El perfil usa SQLite local con migraciones y contenido ficticio reproducible. El disco del Space puede reiniciarse; la información inicial se reconstruye al iniciar el contenedor y puede restablecerse desde el perfil **Administrador del sistema**.

El paquete publicado excluye el adaptador, las migraciones y la dependencia de Oracle. No incorpora archivos `.env`, credenciales ni conexiones institucionales.
