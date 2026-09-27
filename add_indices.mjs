const fs = require('fs');
let c = fs.readFileSync('src/server/db.ts', 'utf8');
const indices = `
  // Optimización de Base de Datos para Producción Masiva
  database.exec("CREATE INDEX IF NOT EXISTS idx_customer_requests_status ON customer_requests(status);");
  database.exec("CREATE INDEX IF NOT EXISTS idx_customer_requests_created_at ON customer_requests(created_at);");
  database.exec("CREATE INDEX IF NOT EXISTS idx_bot_media_queue_created_at ON bot_media_queue(created_at);");
  database.exec("CREATE INDEX IF NOT EXISTS idx_profiles_priority ON profiles(priority_order, updated_at);");
  database.exec("CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);");
`;
c = c.replace(/CREATE TABLE IF NOT EXISTS payment_methods[^;]*;\n\s*\}/, match => match + '\n' + indices);
fs.writeFileSync('src/server/db.ts', c, 'utf8');
