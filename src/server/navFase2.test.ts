import test from 'node:test';
import assert from 'node:assert/strict';

import { buildNavPlansMenuText, isPublicTelegramCallbackData, parseNavAcqFlowData } from './telegram.ts';

// Telegram rechaza el mensaje completo si queda un carácter reservado de MarkdownV2 sin
// escapar (incluso dentro de cursivas/negritas); el cliente entonces ve el fallback
// "contenido no disponible" en vez del menú.
function assertValidMarkdownV2(text: string): void {
  const withoutEscapes = text.replace(/\\./g, '');
  const forbidden = withoutEscapes.match(/[[\]()~`>#+\-=|{}.!]/g);
  assert.deepEqual(forbidden, null, `MarkdownV2 inválido, caracteres sueltos: ${JSON.stringify(forbidden)}`);
  for (const marker of ['*', '_']) {
    const count = withoutEscapes.split(marker).length - 1;
    assert.equal(count % 2, 0, `MarkdownV2 inválido, "${marker}" sin cerrar (${count} apariciones)`);
  }
}

// Fase 2: todos los nuevos patrones de la botonera nativa deben ser públicos (solo lectura).
test('nav_* filter callbacks are recognized as public read-only patterns', () => {
  const patterns = [
    'nav_noop',
    'nav_catalog',
    'nav_list',
    'nav_list_p2',
    'nav_new',
    'nav_new_p3',
    'nav_list_sort_cycle',
    'nav_new_sort_cycle',
    'nav_list_clear',
    'nav_new_clear',
    'nav_list_prompt_zone',
    'nav_list_prompt_q',
    'nav_prof_scz_01',
    'nav_gal_scz_01_p4',
    'nav_pay_scz_01',
    'nav_pmd_qr_bolivia__scz_01'
  ];
  for (const p of patterns) {
    assert.equal(isPublicTelegramCallbackData(p), true, `patrón no reconocido: ${p}`);
  }
});

test('non-nav callbacks keep their previous routing (no regressions)', () => {
  assert.equal(isPublicTelegramCallbackData('client_cmd_menu'), true);
  assert.equal(isPublicTelegramCallbackData('pay_method_qr_bolivia'), true);
  assert.equal(isPublicTelegramCallbackData('admin_dashboard'), false);
  assert.equal(isPublicTelegramCallbackData('req_prof_scz_01'), false);
});

test('the plans menu text is valid MarkdownV2 for any profile name', () => {
  const text = buildNavPlansMenuText('Ana 100% VIP [SCZ]', 450, true);
  assertValidMarkdownV2(text);
  assert.ok(text.includes('*Bs\\. 450*'));
  assertValidMarkdownV2(buildNavPlansMenuText('Ana', 0, false));
});

test('country/confirm callbacks keep working with underscored profile ids', () => {
  const profileId = 'prof_1789716070134';
  for (const step of ['acqs', 'acqc', 'acqok'] as const) {
    const parsed = parseNavAcqFlowData(`nav_${step}_semestral__${profileId}__${encodeURIComponent('Estados Unidos')}`);
    assert.deepEqual(parsed, { step, plan: 'semestral', profileId, country: 'Estados Unidos' });
  }
  assert.equal(parseNavAcqFlowData('nav_acqp_semestral__prof_1'), null);
});
