const fs = require('fs');
let c = fs.readFileSync('src/server/b2Storage.ts', 'utf8');

if (!c.includes('ListObjectVersionsCommand')) {
  c = c.replace(/DeleteObjectCommand,/, 'DeleteObjectCommand,\n  ListObjectVersionsCommand,');
}

c = c.replace(/await connection\.client\.send\(new DeleteObjectCommand\(\{\s*Bucket: connection\.bucket,\s*Key: key\s*\}\)\);/g, 'await obliterateB2Object(connection, key);');

const obliterateLogic = `
async function obliterateB2Object(connection: any, key: string) {
  try {
    const versions = await connection.client.send(new ListObjectVersionsCommand({
      Bucket: connection.bucket,
      Prefix: key
    }));
    
    let deletedAny = false;
    
    if (versions.Versions) {
      for (const v of versions.Versions) {
        if (v.Key === key) {
          await connection.client.send(new DeleteObjectCommand({
            Bucket: connection.bucket,
            Key: key,
            VersionId: v.VersionId
          }));
          deletedAny = true;
        }
      }
    }
    
    if (versions.DeleteMarkers) {
      for (const dm of versions.DeleteMarkers) {
        if (dm.Key === key) {
          await connection.client.send(new DeleteObjectCommand({
            Bucket: connection.bucket,
            Key: key,
            VersionId: dm.VersionId
          }));
          deletedAny = true;
        }
      }
    }
    
    if (!deletedAny) {
      // Fallback
      await connection.client.send(new DeleteObjectCommand({
        Bucket: connection.bucket,
        Key: key
      }));
    }
  } catch (err) {
    console.error('[Obliterate Error]:', err);
    // Fallback if ListObjectVersions is not supported or fails
    await connection.client.send(new DeleteObjectCommand({
      Bucket: connection.bucket,
      Key: key
    }));
  }
}
`;

c = c + '\n' + obliterateLogic;

fs.writeFileSync('src/server/b2Storage.ts', c, 'utf8');
