import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Request, Response } from 'express';
import { Readable } from 'stream';

const requiredVariables = ['B2_BUCKET_NAME', 'B2_ENDPOINT', 'B2_KEY_ID', 'B2_APPLICATION_KEY'] as const;

export function missingB2Variables() {
  return requiredVariables.filter(name => !process.env[name]?.trim());
}

export function isB2Configured() {
  return missingB2Variables().length === 0;
}

function getB2Connection() {
  if (!isB2Configured()) return null;

  const bucket = process.env.B2_BUCKET_NAME!.trim();
  const rawEndpoint = process.env.B2_ENDPOINT!.trim();
  const endpoint = !/^https?:\/\//i.test(rawEndpoint) ? `https://${rawEndpoint}` : rawEndpoint;
  const keyId = process.env.B2_KEY_ID!.trim();
  const applicationKey = process.env.B2_APPLICATION_KEY!.trim();
  const endpointRegion = endpoint.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com/i)?.[1];
  const client = new S3Client({
    region: process.env.B2_REGION?.trim() || endpointRegion || 'us-west-004',
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: keyId, secretAccessKey: applicationKey }
  });

  return { bucket, client };
}

function safeFileName(name: string) {
  const extension = name.toLowerCase().match(/\.[a-z0-9]{1,8}$/)?.[0] || '';
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}${extension}`;
}

export async function uploadToB2(file: Express.Multer.File, folder: 'profiles' | 'qr') {
  const connection = getB2Connection();
  if (!connection) throw new Error(`Backblaze B2 no está configurado: ${missingB2Variables().join(', ')}`);

  const objectKey = `tu-vip/${folder}/${safeFileName(file.originalname)}`;
  await connection.client.send(new PutObjectCommand({
    Bucket: connection.bucket,
    Key: objectKey,
    Body: file.buffer,
    ContentType: file.mimetype,
    ContentDisposition: 'inline',
    CacheControl: 'private, no-store',
    Metadata: { originalname: encodeURIComponent(file.originalname) }
  }));

  return objectKey;
}

export function mediaUrl(baseUrl: string, objectKey: string) {
  return `${baseUrl}/api/media?key=${encodeURIComponent(objectKey)}`;
}

export async function streamB2Object(req: Request, res: Response) {
  const connection = getB2Connection();
  if (!connection) {
    res.status(503).json({
      error: 'Almacenamiento multimedia no configurado',
      missing: missingB2Variables()
    });
    return;
  }

  const objectKey = typeof req.query.key === 'string' ? req.query.key : '';
  if (!objectKey.startsWith('tu-vip/') || objectKey.includes('..')) {
    res.status(400).json({ error: 'Archivo inválido' });
    return;
  }

  try {
    const range = req.headers.range;
    const object = await connection.client.send(new GetObjectCommand({
      Bucket: connection.bucket,
      Key: objectKey,
      Range: range
    }));

    res.status(range ? 206 : 200);
    res.setHeader('Content-Type', object.ContentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Accept-Ranges', 'bytes');
    if (object.ContentLength !== undefined) res.setHeader('Content-Length', String(object.ContentLength));
    if (object.ContentRange) res.setHeader('Content-Range', object.ContentRange);

    const body = object.Body as any;
    if (body?.pipe) body.pipe(res);
    else if (body?.transformToWebStream) Readable.fromWeb(body.transformToWebStream()).pipe(res);
    else res.end(await body?.transformToByteArray?.());
  } catch (error: any) {
    if (!res.headersSent) {
      const providerStatus = Number(error?.$metadata?.httpStatusCode) || 0;
      const providerCode = String(error?.Code || error?.code || error?.name || 'UnknownError');
      res.status(providerStatus === 404 ? 404 : 502).json({
        error: 'No se pudo cargar el archivo',
        provider_status: providerStatus || undefined,
        provider_code: providerCode
      });
    } else {
      res.end();
    }
  }
}
