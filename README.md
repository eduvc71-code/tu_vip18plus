# 💎 Flavia • Ruti VIP (+18) — Galería y Contenido Exclusivo con Telegram Bot

Plataforma Web App VIP integrada 100% en Telegram, diseñada exclusivamente para **una sola modelo (Flavia)** que vende contenido exclusivo **+18** (galerías privadas, packs VIP y atención directa sin intermediarios, **sin comisión ni reserva**).

> **🔒 SEGURIDAD Y PRIVACIDAD TOTAL:**
> El acceso desde navegadores externos está **bloqueado por defecto**. Solo se puede acceder a la galería y al contenido a través del Bot de Telegram o mediante los enlaces de invitación generados por la Administradora.

---

## 🚀 Guía Rápida de Inicio y Enlace para Telegram

Tienes **3 opciones** listas para ejecutar según tu preferencia:

### 🌐 Opción 1: Inicio Instantáneo Automático (Sin Tarjeta ni Cuenta) — `iniciar_cloudflare.ps1`
Ideal para ejecutar desde tu PC. Ahora el script es **inteligente y totalmente automático**:
- Detecta por sí mismo la URL HTTPS de Cloudflare.
- Actualiza tu archivo `.env` automáticamente.
- **Sincroniza el Webhook de Telegram y el botón del Bot automáticamente**, por lo que el link de invitación (`t.me/vip_ruti_bot`) **siempre funcionará** sin importar si la URL temporal cambia.

```powershell
.\iniciar_cloudflare.ps1
```

---

### 🔗 Opción 2: Enlace Permanente que NUNCA vence (Ngrok Dominio Gratis) — `iniciar_ngrok_permanente.ps1`
Si deseas un link que **nunca cambie y nunca expire** sin necesidad de pagar servidor:
1. Regístrate gratis en [ngrok.com](https://dashboard.ngrok.com).
2. En la sección **Domains**, reclama tu dominio estático gratis para siempre (ej: `flavia-vip.ngrok-free.app`).
3. Ejecuta el script indicando tu dominio permanente:
```powershell
.\iniciar_ngrok_permanente.ps1 -Dominio "flavia-vip.ngrok-free.app"
```
Tu bot de Telegram (`@vip_ruti_bot`) y todas las invitaciones quedarán permanentemente enlazadas a esa dirección.

---

### ☁️ Opción 3: Servidor en la Nube 24/7 Permanente

#### A) Render.com (Gratis para siempre, SIN tarjeta de crédito)
El proyecto incluye el archivo `render.yaml` listo para producción:
1. Sube este proyecto a tu repositorio de GitHub.
2. Entra a [Render.com](https://render.com) > **New > Web Service** y conecta el repositorio.
3. Render detectará automáticamente el archivo `render.yaml` y publicará tu app 24/7 gratis.

#### B) Fly.io (`deploy_flyio.ps1`)
> *Nota importante: Fly.io requiere tener una tarjeta de crédito/débito verificada en su panel (`fly.io/dashboard/billing`) para permitir la creación de servidores. Si te aparece el error `requested machine count exceeds organization limit`, debes agregar una tarjeta en tu cuenta de Fly.io o utilizar la opción de **Render.com** o **Ngrok** descritas arriba.*

---

## 📋 Comandos del Bot de Telegram (`@vip_ruti_bot`)

- `/start` - Mensaje de bienvenida VIP y botón para abrir la Mini App en Telegram.
- `/invitar` - Genera el enlace oficial de invitación de Telegram para compartir con clientes VIP.
- `/anclar` - Crea la tarjeta principal y la ancla en tu grupo o canal VIP de Telegram.
- `/nuevo` - Crea o modifica el perfil de Flavia desde Telegram.
- `/admin` - Panel de administración para revisar solicitudes y cambiar estados.
- `/id` - Consulta tu ID numérico de Telegram.
