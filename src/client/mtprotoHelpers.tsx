import React from 'react';

/**
 * Renderiza la etiqueta <tg-emoji> de Telegram como string para usar en mensajes y canales.
 */
export function renderEmojiTag(customId: string, fallback: string): string {
  return `<tg-emoji emoji-id="${customId}">${fallback}</tg-emoji>`;
}

/**
 * Componente o función de utilidad para previsualizar el emoji en el navegador web / panel de administración
 * sin requerir guardar archivos multimedia locales.
 */
export function renderEmojiPreview(customId: string, fallback: string, size = 28): React.ReactElement {
  const src = `/emoji/preview/${customId}`;
  const isVideo = fallback.endsWith('.webm') || fallback.endsWith('.mp4');

  if (isVideo) {
    return React.createElement('video', {
      src,
      autoPlay: true,
      loop: true,
      muted: true,
      playsInline: true,
      style: {
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-block',
        verticalAlign: 'middle',
        objectFit: 'contain'
      }
    });
  }

  return React.createElement('img', {
    src,
    alt: fallback,
    title: `ID: ${customId}`,
    loading: 'lazy',
    style: {
      width: `${size}px`,
      height: `${size}px`,
      display: 'inline-block',
      verticalAlign: 'middle',
      objectFit: 'contain'
    },
    onError: (e: any) => {
      // Si la carga falla, mostrar el carácter fallback nativo
      e.currentTarget.style.display = 'none';
      if (e.currentTarget.parentNode) {
        const span = document.createElement('span');
        span.textContent = fallback || '✨';
        span.style.fontSize = `${size * 0.75}px`;
        e.currentTarget.parentNode.appendChild(span);
      }
    }
  });
}

