import fs from 'fs';

let content = fs.readFileSync('src/server/routes.ts', 'utf8');

// Insert guestRateLimits map at the top level
const mapStr = "\nconst guestRateLimits = new Map<string, number>();\n";
if (!content.includes('guestRateLimits')) {
  // Find a good place to put it, after imports
  content = content.replace(/(import .*?\n)+/, match => match + mapStr);
}

// Replace the duplicate logic
const search = `    // Prevent repeated submissions from creating duplicate admin notifications.
    if (safeUserId) {
      const duplicate = await findRecentDuplicateCustomerRequest(safeUserId, profile.id, purchaseMessage, 10);
      if (duplicate) {
        res.json({
          success: true,
          duplicate: true,
          message: 'Ya recibimos tu solicitud reciente. La Administradora responderá por privado.',
          request: duplicate
        });
        return;
      }
    }`;

const replace = `    // Prevent repeated submissions from creating duplicate admin notifications.
    if (safeUserId === 'guest') {
      const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
      const lastRequestTime = guestRateLimits.get(clientIp);
      const tenMinutes = 10 * 60 * 1000;

      if (lastRequestTime && (Date.now() - lastRequestTime) < tenMinutes) {
        res.json({
          success: true,
          duplicate: true,
          message: 'Ya recibimos tu solicitud reciente. La Administradora responderá por privado.'
        });
        return;
      }
      guestRateLimits.set(clientIp, Date.now());
    } else if (safeUserId) {
      const duplicate = await findRecentDuplicateCustomerRequest(safeUserId, profile.id, purchaseMessage, 10);
      if (duplicate) {
        res.json({
          success: true,
          duplicate: true,
          message: 'Ya recibimos tu solicitud reciente. La Administradora responderá por privado.',
          request: duplicate
        });
        return;
      }
    }`;

content = content.replace(search, replace);

fs.writeFileSync('src/server/routes.ts', content, 'utf8');
console.log("Patched routes.ts");
