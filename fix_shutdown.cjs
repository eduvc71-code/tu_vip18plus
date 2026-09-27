const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

const shutdownLogic = `
// Graceful shutdown: Ensure DB is synced before exiting
import { syncDbToB2Now } from './src/server/db.js';

let isShuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(\`\n[\${signal}] Recibido. Guardando base de datos en Backblaze B2 antes de salir...\`);
  try {
    await syncDbToB2Now();
    console.log('✅ Base de datos respaldada exitosamente. Saliendo...');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error al respaldar base de datos durante el apagado:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
`;

if (!c.includes('gracefulShutdown')) {
  c = c + '\n' + shutdownLogic;
  fs.writeFileSync('server.ts', c, 'utf8');
}
