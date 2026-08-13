import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Request, Response } from 'express';
import { Readable } from 'stream';

const bucket = process.env.B2_BUCKET_NAME?.trim() || '';
const rawEndpoint = process.env.B2_ENDPOINT?.trim() || '';
const endpoint = rawEndpoint && !/^https?:\/\//i.test(rawEndpoint) ? `https://${rawEndpoint}` : rawEndpoint;
const keyId = process.env.B2_KEY_ID?.trim() || '';
const applicationKey = process.env.B2_APPLICATION_KEY?.trim() || '';
const endpointRegion = endpoint.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com/i)?.[1];

export const isB2Configured = Boolean(bucket && endpoint && keyId && applicationKey);

const client = isB2Configured
  ? new S3Client({
      region: process.env.B2_REGION?.trim() || endpointRegion || 'us-west-004',
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: keyId,
        secretAccessKey: applicationKey
      }
    })
  : null;

function safeFileName(name: string) {
  const extension = name.toLowerCase().match(/\.[a-z0-9]{1,8}$/)?.[0] || '';
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}${extension}`;
}

export async function uploadToB2(file: Express.Multer.File, folder: 'profiles' | 'qr') {
  if (!client) throw new Error('Backblaze B2 no está configurado');

  const objectKey = `tu-vip/${folder}/${safeFileName(file.originalname)}`;
  await client.send(new PutObjectCommand({
    Bucket: bucket,
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
  if (!client) {
    res.status(503).json({ error: 'Almacenamiento multimedia no configurado' });
    return;
  }

  const objectKey = typeof req.query.key === 'string' ? req.query.key : '';
  if (!objectKey.startsWith('tu-vip/') || objectKey.includes('..')) {
    res.status(400).json({ error: 'Archivo inválido' });
    return;
  }

  try {
    const range = req.headers.range;
    const object = await client.send(new GetObjectCommand({
      Bucket: bucket,
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
      res.status(error?.$metadata?.httpStatusCode === 404 ? 404 : 502).json({ error: 'No se pudo cargar el archivo' });
    } else {
      res.end();
    }
  }
}
