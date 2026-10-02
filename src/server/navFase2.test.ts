import test from 'node:test';
import assert from 'node:assert/strict';

import { isPublicTelegramCallbackData } from './telegram.ts';

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
