# 🚀 EL PLAN MAESTRO: Escalabilidad Infinita y Gratuita

Este documento contiene la estrategia paso a paso para migrar el almacenamiento de la Mini App a **Backblaze B2 + Cloudflare** (Bandwidth Alliance), logrando alojamiento escalable con **ancho de banda 100% gratuito e ilimitado**.

---

## 📌 FASE 1: Requisitos Previos (Lo que debe conseguir la Creadora)

1. **Comprar un Dominio Propio**
   - **Qué es:** Un nombre web profesional (ej. `catalogoflavia.com`, `rutivip.net`).
   - **Costo:** ~$10 - $15 USD por **año**.
   - **Dónde:** Namecheap, GoDaddy, o el mismo Cloudflare.
2. **Cuenta Gratis en Cloudflare**
   - Registrarse en [cloudflare.com](https://www.cloudflare.com/) (Plan Gratuito).
3. **Cuenta Gratis en Backblaze B2**
   - Registrarse en [backblaze.com/b2/cloud-storage.html](https://www.backblaze.com/b2/cloud-storage.html) (Plan Gratuito: 10 GB de por vida).

---

## 📌 FASE 2: Configuración de la Bodega (Backblaze B2)

Cuando las cuentas estén creadas, realizaremos estos pasos:
1. Ir al panel de Backblaze B2.
2. Crear un **Bucket (Balde)** y configurarlo como `Public`.
3. Ir a *App Keys* y generar una nueva **Application Key**.
4. Anotar tres datos cruciales:
   - `B2_APPLICATION_KEY_ID` (El identificador)
   - `B2_APPLICATION_KEY` (La clave secreta)
   - `B2_BUCKET_NAME` (El nombre exacto del bucket)

---

## 📌 FASE 3: Configuración del Escudo (Cloudflare)

Aquí es donde ocurre la magia de la "Bandwidth Alliance" (Internet Gratis):
1. Añadir el dominio comprado a Cloudflare y cambiar los DNS en la página donde se compró el dominio.
2. En Cloudflare, ir a la sección **DNS**.
3. Crear un registro `CNAME`:
   - **Nombre:** `cdn` (para que la URL quede como `cdn.tudominio.com`).
   - **Objetivo:** La URL pública que nos dio Backblaze B2 (ej. `f000.backblazeb2.com`).
   - **Proxy status:** 🟠 Proxied (La nubecita naranja activada, ESTO ES VITAL para que sea gratis).
4. **Regla de Transformación (Transform Rule):**
   - Crear una regla en Cloudflare que reescriba la URL para ocultar el nombre del bucket al público.
   - De esta forma, el archivo `cdn.tudominio.com/foto.jpg` internamente buscará en `file/nombre-del-bucket/foto.jpg`.

---

## 📌 FASE 4: Activar en Render (El Código ya está listo)

El código de la aplicación ya tiene la integración programada. Solo faltará:
1. Ir al Dashboard de Render > Environment Variables.
2. Agregar las claves que anotamos en la Fase 2:
   - `B2_APPLICATION_KEY_ID` = `...`
   - `B2_APPLICATION_KEY` = `...`
   - `B2_BUCKET_NAME` = `...`
   - `B2_REGION` = `us-west-004` (o la que asigne Backblaze)
   - `B2_CUSTOM_DOMAIN` = `https://cdn.tudominio.com` (El dominio configurado en Cloudflare)
3. Reiniciar el servidor en Render.

### 🎉 ¡RESULTADO FINAL!
Desde ese segundo en adelante, cada vez que subas una foto a la Mini App, el sistema la guardará automáticamente en Backblaze B2. Cuando los clientes de los 12k suscriptores entren a la app, descargarán las fotos a través de `cdn.tudominio.com` (Cloudflare).
**El costo de ancho de banda para Render y Backblaze caerá a cero ($0.00 USD) de forma permanente.**
