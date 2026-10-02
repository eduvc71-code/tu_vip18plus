import test from 'node:test';
import assert from 'node:assert/strict';

import { extractCountryFromRequestText, isSpecialPlanRequest, resolveAutoReplyMethodId } from './routes.ts';
import { buildPaymentMethodsKeyboard, getAdminContactUsername, getOfficialFeeText, isPublicTelegramCallbackData, parseTelegramBotoneraCallbackData } from './telegram.ts';

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

test('getOfficialFeeText does not invent a Bolivia price when no live rate is available', () => {
  assert.equal(getOfficialFeeText(methods[0], undefined), 'Consultar con Administradora');
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

test('payment details always resolve the configured admin contact username', () => {
  const previous = process.env.ADMIN_CONTACT_USERNAME;
  process.env.ADMIN_CONTACT_USERNAME = '@mi_admin_vip';
  assert.equal(getAdminContactUsername(), 'mi_admin_vip');
  if (previous === undefined) delete process.env.ADMIN_CONTACT_USERNAME;
  else process.env.ADMIN_CONTACT_USERNAME = previous;
});

test('callback payloads tolerate underscores inside Telegram botonera ids', () => {
  const countryData = parseTelegramBotoneraCallbackData('vip_country_botonera_1697031305000_abc_bolivia');
  assert.deepEqual(countryData, { kind: 'country', botoneraId: 'botonera_1697031305000_abc', countryId: 'bolivia' });

  const planMenuData = parseTelegramBotoneraCallbackData('vip_plan_menu_botonera_1697031305000_abc_bolivia');
  assert.deepEqual(planMenuData, { kind: 'plan_menu', botoneraId: 'botonera_1697031305000_abc', countryId: 'bolivia' });

  const planData = parseTelegramBotoneraCallbackData('vip_plan_botonera_1697031305000_abc_bolivia_monthly');
  assert.deepEqual(planData, { kind: 'plan', botoneraId: 'botonera_1697031305000_abc', countryId: 'bolivia', planId: 'monthly' });
});

test('legacy public Telegram payloads without botonera id still resolve the active country flow', () => {
  assert.deepEqual(parseTelegramBotoneraCallbackData('vip_country_bolivia'), { kind: 'country', countryId: 'bolivia' });
  assert.deepEqual(parseTelegramBotoneraCallbackData('vip_plan_menu_bolivia'), { kind: 'plan_menu', countryId: 'bolivia' });
  assert.deepEqual(parseTelegramBotoneraCallbackData('vip_plan_bolivia_monthly'), { kind: 'plan', countryId: 'bolivia', planId: 'monthly' });
});

test('payment keyboard is built from active methods and keeps real callback routing', async () => {
  const methods = [
    { id: 'wallet', title: 'Mi Wallet', category: 'service', image_url: null, description: 'Pago digital', price: '150', is_active: true, priority_order: 20 },
    { id: 'qr_bolivia', title: '🇧🇴 QR Bolivia', category: 'national', image_url: 'https://example.com/qrcode.jpg', description: 'Paga por QR', price: null, is_active: true, priority_order: 10 },
    { id: 'inactive', title: 'Método oculto', category: 'service', image_url: null, description: 'No visible', price: '999', is_active: false, priority_order: 5 }
  ] as any[];

  const keyboard = await buildPaymentMethodsKeyboard(methods);
  assert.deepEqual(keyboard[0], [{ text: '🇧🇴 QR Bolivia', callback_data: 'pay_method_qr_bolivia' }]);
  assert.deepEqual(keyboard[1], [{ text: 'Mi Wallet', callback_data: 'pay_method_wallet' }]);
  assert.deepEqual(keyboard.at(-1), [{ text: '🔙 Volver al Menú', callback_data: 'client_cmd_menu' }]);
});
