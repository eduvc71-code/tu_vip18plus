import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { router as apiRouter } from './src/server/routes.js';
import { getDb } from './src/server/db.js';
import { updateBotMenuButton, registerBotWebhook } from './src/server/telegram.js';

async function startServer() {
  // Ensure DB initialized
  await getDb();

  const app = express();
  const PORT = Number(process.env.PORT) || 3001;
  const HOST = process.env.HOST || '0.0.0.0';
  const isProduction = process.env.NODE_ENV === 'production' || process.env.PROD === 'true' || process.env.npm_lifecycle_event === 'start';

  // Middlewares
  app.use(cors());
  app.use(express.json({ limit: '60mb' }));
  app.use(express.urlencoded({ extended: true, limit: '60mb' }));

  // Ensure data/uploads exists (important for persistent volumes like Fly.io where public/uploads is a symlink to data/uploads)
  const dataUploadsPath = path.join(process.cwd(), 'data', 'uploads');
  if (!fs.existsSync(dataUploadsPath)) {
    fs.mkdirSync(dataUploadsPath, { recursive: true });
  }

  // Static folder for uploaded image assets
  const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsPath, {
    setHeaders: (res) => {
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-store');
    }
  }));
  app.use(express.static(path.join(process.cwd(), 'public')));

  // API routes FIRST
  app.use('/api', apiRouter);

  // Vite middleware for development vs static serve for production
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: {
          port: Number(process.env.VITE_HMR_PORT || 24679)
        }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Tú • Espacio VIP (+18)] =============================================`);
    console.log(`[Tú • Espacio VIP (+18)] 🌐 Servidor activo en: http://localhost:${PORT}`);
    console.log(`[Tú • Espacio VIP (+18)]    (Contenido privado para mayores de edad)`);
    console.log(`[Tú • Espacio VIP (+18)] =============================================`);
    updateBotMenuButton().then(res => {
      console.log('[Telegram Bot] Bot menu button updated:', res);
    }).catch(err => {
      console.error('[Telegram Bot] Error updating menu button:', err);
    });
    registerBotWebhook().then(res => {
      console.log('[Telegram Bot] Webhook registered:', res);
    }).catch(err => {
      console.error('[Telegram Bot] Error registering webhook:', err);
    });
  });
}

startServer().catch(err => {
  console.error('Error al iniciar el servidor Express:', err);
});
