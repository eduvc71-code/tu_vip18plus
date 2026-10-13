# 💎 IAM Danii • Canal VIP Free (+18) — Telegram Bot & Mini App

Plataforma Web App VIP integrada 100% en Telegram, diseñada para **IAM Danii** con contenido exclusivo **+18** (galerías privadas protegidas, imágenes sugestivas efímeras y atención directa mediante Bot oficial).

> **🔒 SEGURIDAD Y PRIVACIDAD TOTAL:**
> El acceso desde navegadores externos está **bloqueado por defecto**. Solo se puede acceder a la galería y al contenido a través del Bot oficial de Telegram (`@Danii_Catalogo_SCZ_bot`) o mediante los enlaces de invitación generados por la Administradora.

---

## ☁️ Despliegue en Servidor Permanente (Render.com)

El proyecto incluye el archivo `render.yaml` listo para producción:
1. Sube este proyecto a tu repositorio de GitHub.
2. Entra a [Render.com](https://render.com) > **New > Blueprint** o **Web Service** y conecta el repositorio.
3. Render detectará automáticamente el archivo `render.yaml` y desplegará tu app 24/7 de forma continua.

---

## 📋 Comandos del Bot de Telegram (`@Danii_Catalogo_SCZ_bot`)

### 👤 Comandos de Clientes (con Botones Interactivos)
- `/start` - Bienvenida VIP y botón directo para abrir la Mini App (`Ver Canal VIP Free`).
- `/canal` - Acceso directo e información de nuestro Canal VIP Oficial.
- `/precios` - Tarifas actualizadas de suscripción VIP y métodos de pago.
- `/info` - Información sobre el contenido exclusivo y la discreción del servicio.
- `/ayuda` - Soporte y contacto directo con la administradora.

### 👑 Comandos de Administradoras (con Botones de Gestión)
- `/admin` - Panel administrativo con botones directos para gestionar perfiles, solicitudes y enlace seguro.
- `/invitar` - Genera el enlace oficial de invitación de Telegram.
- `/anclar` - Publica y ancla el perfil de Danii en el canal de Telegram.
- `/qr <id_cliente>` - Envía el código QR de pago directamente al cliente para la suscripción.
- `/nuevo` - Crea o modifica el perfil desde Telegram.
- `/id` - Consulta tu ID numérico de Telegram.

---

## 🎨 Importar Packs de Emojis Premium (MTProto)

El sistema soporta importar paquetes de emojis personalizados de Telegram para usarlos en el Panel de Administración y publicarlos en canales con formato enriquecido nativo:

1. **Variables de Entorno requeridas (`.env`):**
   ```env
   TG_API_ID=tu_api_id
   TG_API_HASH=tu_api_hash
   TELEGRAM_BOT_TOKEN=tu_bot_token
   ```
2. **Características clave:**
   - **Cero almacenamiento local de archivos:** Los archivos multimedia (.tgs, .webm, .png) no se guardan en el servidor local. Se consumen directamente desde las redes CDN de Telegram.
   - **Identificadores de 64 bits precisos:** `custom_emoji_id` se almacena estrictamente como `TEXT` en la base de datos para prevenir pérdida de precisión en JavaScript y SQLite.
   - **Previsualización en navegador:** La ruta `/emoji/preview/:customId` permite previsualizar los emojis tanto en imagen como en video dentro de la Mini App.
   - **Sanitización estricta para Telegram:** Al publicar mensajes en el canal con `parse_mode: 'HTML'`, el sanitizador protege el texto mientras preserva intactas las etiquetas `<tg-emoji id="...">fallback</tg-emoji>`.

