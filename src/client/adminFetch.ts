/**
 * adminFetch — ayudante único para llamadas autenticadas del Panel Admin.
 * - Solo arma los headers igual que se hacía a mano.
 * - Con FormData NUNCA pone Content-Type.
 * - NO reintenta, NO cierra sesión en 401, NO muestra mensajes.
 * - Acepta token nulo o indefinido con seguridad de tipos.
 */
export type AdminFetchOptions = Omit<RequestInit, 'body' | 'headers'> & {
  json?: unknown;
  body?: BodyInit | null;
  headers?: Record<string, string>;
};

export function adminFetch(
  url: string,
  token?: string | null,
  options: AdminFetchOptions = {}
): Promise<Response> {
  const { json, body, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    ...(headers || {})
  };

  if (token) {
    finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  let finalBody: BodyInit | null | undefined = body;
  if (json !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(json);
  }

  return fetch(url, { ...rest, headers: finalHeaders, body: finalBody });
}