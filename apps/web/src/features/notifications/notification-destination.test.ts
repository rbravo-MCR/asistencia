import { describe, expect, it } from 'vitest';
import { notificationDestination } from './notification-destination';

describe('notificationDestination', () => {
  it('conserva rutas internas con consulta y fragmento', () => {
    expect(notificationDestination('/solicitudes?estado=PENDING#detalle')).toBe(
      '/solicitudes?estado=PENDING#detalle',
    );
  });
  it.each([
    '//externo.test',
    '/\\externo.test',
    '/\n/externo.test',
    'https://externo.test',
    'javascript:alert(1)',
    'solicitudes',
    '',
  ])('rechaza destino inseguro %j', (href) => {
    expect(notificationDestination(href)).toBeNull();
  });
});
