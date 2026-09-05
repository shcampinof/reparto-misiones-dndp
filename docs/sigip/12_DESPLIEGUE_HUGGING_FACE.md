# Despliegue de la demo SIGIP-DP en Hugging Face Spaces

## Estado y destino

- **Space:** `shcampinof/paloma-bot`, reutilizado con autorización explícita.
- **Página privada:** `https://huggingface.co/spaces/shcampinof/paloma-bot`.
- **Servicio autenticado:** `https://shcampinof-paloma-bot.hf.space`.
- **Visibilidad verificada:** privada.
- **SDK:** Docker.
- **Puerto:** `7860`.
- **Commit remoto validado:** `fa97cabdee3e4a69c20cd4a26fb7bff1ed6e7af6`.
- **Build remoto:** `RUNNING` en `cpu-basic`; dominio en estado `READY`.

El despliegue usa un repositorio de Hugging Face independiente. No se hace push del código al repositorio GitHub principal ni se publica la documentación funcional interna.

## Configuración requerida

Variables incluidas en el entorno del contenedor:

- `NODE_ENV=production`;
- `PORT=7860`;
- `HOST=0.0.0.0`;
- `DEMO_MODE=true`;
- `DEMO_RESET_ON_START=true`;
- `STATIC_DIR=/app/public`.

Secret obligatorio del Space, sin registrar su valor en archivos, historial o logs:

- `JWT_SECRET`: cadena aleatoria robusta de al menos 32 caracteres.

## Paquete de publicación saneado

Desde la raíz del repositorio:

```powershell
.\deploy\huggingface-space\prepare-space.ps1
```

El comando reconstruye `.space-package/` usando una lista permitida: Dockerfile, metadatos públicos mínimos y código ejecutable de frontend/backend. Excluye `docs/sigip/`, Git, pruebas, archivos `.env`, ZIP, videos, transcripciones, documentos fuente, dependencias locales y artefactos de compilación.

## Construcción y prueba local

```powershell
docker build --no-cache -t sigip-dp-demo:local .space-package
docker run --rm --name sigip-dp-demo -p 7860:7860 --env JWT_SECRET sigip-dp-demo:local
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

## Actualización del Space existente

La cuenta actual no puede crear nuevos Docker Spaces sin PRO. El despliegue reutiliza el Docker Space existente y privado, sin intentar crearlo nuevamente. Con `huggingface_hub` instalado y autenticación local:

```powershell
.\deploy\huggingface-space\publish-space.ps1 `
  -SpaceId shcampinof/paloma-bot `
  -Package .space-package
```

El script se niega a publicar si el Space no es privado o no usa Docker. Sincroniza exclusivamente el paquete saneado sobre el repositorio separado del Space y espera el resultado del build. `JWT_SECRET` debe permanecer configurado como Secret en **Space → Settings → Variables and secrets**.

En cada actualización:

1. ejecute lint, pruebas y build;
2. regenere `.space-package/`;
3. revise su inventario y busque secretos o datos reales;
4. construya y pruebe la imagen desde cero;
5. suba el directorio saneado;
6. espere el estado `RUNNING` y repita los smoke tests autenticados.

La validación remota del despliegue comprobó `/api/health`, `/api/ready`, la SPA, el refresco de `/portal`, acceso por perfil, el recorrido completo de Investigación, el recorrido completo de Víctimas y el restablecimiento a seis casos iniciales.

Para un Space privado, el smoke acepta `-HfToken` y envía la autenticación de Hugging Face separada del JWT de SIGIP. El valor debe obtenerse del almacén local seguro y nunca escribirse en archivos ni imprimirse en la consola.

## Restablecimiento de la demo

- Desde la interfaz: entrar como **Administrador del sistema** y seleccionar **Restablecer información inicial**.
- Desde infraestructura: reiniciar el Space. `DEMO_RESET_ON_START=true` reconstruye las semillas sintéticas al iniciar cada contenedor.

## Limitaciones de almacenamiento

El repositorio de demostración está en memoria. Los cambios sobreviven mientras vive el proceso, pero pueden perderse cuando Hugging Face reinicia, suspende o reconstruye el contenedor. Esto es deliberado para la presentación y no constituye persistencia productiva.

## Preparación antes de una reunión

1. Abra la página privada del Space con una cuenta autorizada.
2. Confirme que el estado sea `RUNNING` y que `/api/ready` responda `ready`.
3. restablezca la información inicial con **Administrador del sistema**;
4. compruebe el banner permanente **“Ambiente de demostración — datos no reales”**;
5. recorra una radicación de Investigación y una solicitud pericial de Víctimas;
6. mantenga abierta la pantalla inicial unos minutos antes de presentar para evitar esperas por reanudación del Space.

## Reversa

El contenido anterior de Paloma Bot quedó respaldado fuera del repositorio SIGIP-DP en `C:\Users\Pc\Desktop\HF_SPACE_BACKUPS\paloma-bot-b9b011b5c78e`, correspondiente a la revisión `b9b011b5c78ed6c30e5330d7ad0c28c963637063`. Ese respaldo puede contener información del sistema anterior y no debe copiarse, publicarse ni incorporarse a SIGIP-DP.

1. mantenga el Space privado;
2. cargue el respaldo como un commit de reversa o restaure la revisión anterior desde **Files and versions**;
3. espere la reconstrucción y valide el comportamiento de la aplicación restaurada;
4. para fallos exclusivamente relacionados con los datos temporales de SIGIP-DP, reinicie o restablezca la demo en lugar de revertir código.

La reversa no modifica el repositorio GitHub principal ni despliega componentes institucionales.
