import test from 'node:test';
import assert from 'node:assert/strict';

import { extractCountryFromRequestText, isSpecialPlanRequest, resolveAutoReplyMethodId } from './routes.ts';
import { getOfficialFeeText, isPublicTelegramCallbackData } from './telegram.ts';

const methods = [
  { id: 'qr_bolivia', title: '🇧🇴 QR Bolivia', price: null },
  { id: 'peru', title: '🇵🇪 Perú', price: '120' },
  { id: 'argentina', title: '🇦🇷 Argentina', price: '80' },
];

test('resolveAutoReplyMethodId matches Bolivia from payment method name', () => {
  assert.equal(resolveAutoReplyMethodId('Quiero pagar desde Bolivia', methods), 'qr_bolivia');
});

test('resolveAutoReplyMethodId matches non-Bolivia country from payment method title', () => {
  assert.equal(resolveAutoReplyMethodId('Pago desde Perú', methods), 'peru');
});

test('getOfficialFeeText uses the profile rate for Bolivia', () => {
  assert.equal(getOfficialFeeText(methods[0], 450), 'Bs. 450 / mes');
});

test('getOfficialFeeText uses the configured method price for other countries', () => {
  assert.equal(getOfficialFeeText(methods[1], undefined), '120 / mes');
});

test('special plans are excluded from the auto-reply payment flow', () => {
  assert.equal(isSpecialPlanRequest('Hola, estoy interesado en la SUSCRIPCIÓN SEMESTRAL. Soy de Bolivia.'), true);
  assert.equal(isSpecialPlanRequest('Hola, estoy interesado en la SUSCRIPCIÓN PERMANENTE. Soy de Perú.'), true);
  assert.equal(isSpecialPlanRequest('Quiero pagar desde Perú'), false);
});

test('extractCountryFromRequestText keeps the country in the client message', () => {
  assert.equal(extractCountryFromRequestText('Hola, estoy interesado en la SUSCRIPCIÓN SEMESTRAL. Soy de Bolivia. Solicito información VIP.'), 'Bolivia');
  assert.equal(extractCountryFromRequestText('Hola, estoy interesado en la SUSCRIPCIÓN PERMANENTE. Soy de Perú.'), 'Perú');
  assert.equal(extractCountryFromRequestText('Requiero información VIP.'), 'No especificado');
});

test('public Telegram callback prefixes are allowed for all users', () => {
  assert.equal(isPublicTelegramCallbackData('client_cmd_menu'), true);
  assert.equal(isPublicTelegramCallbackData('vip_country_123_bolivia'), true);
  assert.equal(isPublicTelegramCallbackData('vip_plan_123_bolivia_monthly'), true);
  assert.equal(isPublicTelegramCallbackData('pay_method_qr_bolivia'), true);
  assert.equal(isPublicTelegramCallbackData('admin_btn_list'), false);
});
