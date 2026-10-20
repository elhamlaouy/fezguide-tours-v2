import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('local inquiry preparation does not claim server receipt or a confirmed booking', () => {
  const source = readFileSync(new URL('../src/components/BookingModal.tsx', import.meta.url), 'utf8') + readFileSync(new URL('../src/cms/booking-copy.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /Booking Request Received|Réservation Reçue|reserva recibida|confirmation within 2 hours|en moins de 2h|plazo de 2 horas/);
  assert.match(source, /Inquiry prepared — not sent yet/);
  assert.match(source, /Demande préparée — pas encore envoyée/);
  assert.match(source, /Solicitud preparada — aún no enviada/);
  assert.match(source, /Nothing has been sent yet/);
  assert.match(source, /Aucune demande n’a encore été envoyée/);
  assert.match(source, /Todavía no se ha enviado ninguna solicitud/);
  assert.match(source, /href=\{getWhatsAppMessage\(\)\}/);
  assert.match(source, /setIsSubmitted\(true\)/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|fetch\(/);
});
