# Despliegue de SIGIP-DP en Hugging Face Spaces

## Estado y destino canónico

- **Space:** `shcampinof/reparto-misiones-dndp`.
- **Página:** `https://huggingface.co/spaces/shcampinof/reparto-misiones-dndp`.
- **Servicio:** `https://shcampinof-reparto-misiones-dndp.hf.space`.
- **SDK:** Docker.
- **Puerto:** `7860`.
- **Verificación del 8-sep-2026:** la API pública de Hugging Face informó `RUNNING`, `sdk=docker` y el host anterior; `/api/health` respondió HTTP 200.

El despliegue usa el repositorio independiente del Space y no publica `docs/sigip/`, fuentes de levantamiento, pruebas ni archivos locales. Los scripts se niegan a subir a cualquier identificador distinto del Space canónico.

## Configuración requerida

Variables del contenedor:

- `NODE_ENV=production`;
- `PORT=7860`;
- `HOST=0.0.0.0`;
- `DEMO_MODE=true`;
- `DEMO_RESET_ON_START=true`;
- `STATIC_DIR=/app/public`.

Secret obligatorio del Space, sin registrar su valor en archivos, historial o logs:

- `JWT_SECRET`: cadena aleatoria robusta de al menos 32 caracteres.

Los nombres técnicos de las variables se conservan por compatibilidad interna. La interfaz presenta el sistema sin expresiones propias del perfil de presentación.

## Paquete de publicación saneado

Desde la raíz del repositorio:

```powershell
.\deploy\huggingface-space\prepare-space.ps1
```

El comando reconstruye `.space-package/` mediante una lista permitida: Dockerfile, metadatos públicos mínimos y código ejecutable de frontend/backend. Excluye documentación interna, Git, pruebas, `.env`, ZIP, videos, transcripciones, documentos fuente, dependencias locales y artefactos de compilación.

## Construcción y prueba local

```powershell
docker build --no-cache -t sigip-dp-presentation:local .space-package
docker run --rm --name sigip-dp-presentation -p 7860:7860 --env JWT_SECRET sigip-dp-presentation:local
```

`JWT_SECRET` debe existir previamente en el entorno local; el comando transmite la variable sin escribir ni mostrar su valor.

Comprobaciones:

```powershell
Invoke-RestMethod http://127.0.0.1:7860/api/health
Invoke-RestMethod http://127.0.0.1:7860/api/ready
Invoke-WebRequest http://127.0.0.1:7860/ -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:7860/portal -UseBasicParsing
.\deploy\huggingface-space\smoke-test.ps1 -BaseUrl http://127.0.0.1:7860
```

## Publicación

Con `huggingface_hub` instalado y una sesión local ya autenticada:

```powershell
.\deploy\huggingface-space\publish-space.ps1 `
  -SpaceId shcampinof/reparto-misiones-dndp `
  -Package .space-package
```

El script valida el destino exacto y el SDK Docker, sincroniza únicamente el paquete saneado y espera el resultado del build. No solicita ni imprime tokens. `JWT_SECRET` debe permanecer configurado como Secret en **Space → Settings → Variables and secrets**.

En cada actualización:

1. ejecute lint, formato, pruebas API y de navegador, build y smoke local;
2. regenere `.space-package/`;
3. revise su inventario y busque secretos o datos reales;
4. construya y pruebe la imagen desde cero cuando Docker esté disponible;
5. publique exclusivamente en `shcampinof/reparto-misiones-dndp`;
6. espere `RUNNING` y repita el smoke remoto.

## Restablecimiento de la información inicial

- Desde la interfaz: entrar como **Administrador del sistema** y seleccionar **Restablecer información inicial**.
- Desde infraestructura: reiniciar el Space. `DEMO_RESET_ON_START=true` reconstruye internamente el perfil de presentación al iniciar cada contenedor.

El administrador conserva esta función técnica y consulta global. No puede aprobar, repartir, devolver informes o cerrar solicitudes por su rol.

## Limitaciones

El perfil de presentación usa SQLite migrado en el disco local del contenedor. Los cambios sobreviven mientras se conserve esa instancia, pero pueden perderse cuando Hugging Face reinicia, suspende o reconstruye el contenedor. La información ficticia se reconstruye de forma reproducible; esto no constituye persistencia institucional.

No hay Oracle, SharePoint, AD/Entra ID, correo real, migración histórica ni interoperabilidad institucional. Los valores de plazo, cobertura y desempate pendientes continúan identificados internamente como no aprobados.

## Reversa

La reversa permitida se limita a una revisión anterior del mismo Space canónico, desde **Files and versions**, seguida por validación de build y smoke. No se copia contenido ni se publica en repositorios o Spaces ajenos al destino canónico.
