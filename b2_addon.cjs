const fs = require('fs');
let c = fs.readFileSync('src/server/b2Storage.ts', 'utf8');

const newFn = `
export async function listAllB2Files(prefix: string = 'tu-vip/', limit = 1000) {
  const connection = getB2Connection();
  if (!connection) return [];
  try {
    const res = await connection.client.send(new ListObjectsV2Command({
      Bucket: connection.bucket,
      Prefix: prefix,
      MaxKeys: limit
    }));
    return (res.Contents || []).map(item => ({
      key: item.Key || '',
      size: item.Size || 0,
      lastModified: item.LastModified ? item.LastModified.toISOString() : new Date().toISOString(),
      name: (item.Key || '').split('/').pop() || ''
    })).sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  } catch (err) {
    console.error('[B2 List Files Error]:', err);
    return [];
  }
}

export async function restoreDatabaseFromB2(key: string): Promise<Buffer | null> {
  const connection = getB2Connection();
  if (!connection) return null;
  try {
    const res = await connection.client.send(new GetObjectCommand({
      Bucket: connection.bucket,
      Key: key
    }));
    if (!res.Body) return null;
    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as any) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (err) {
    console.error('[B2 Restore Backup Error]:', err);
    return null;
  }
}
`;
c = c + newFn;
fs.writeFileSync('src/server/b2Storage.ts', c, 'utf8');
