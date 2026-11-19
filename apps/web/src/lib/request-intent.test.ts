import { describe, expect, it } from 'vitest';
import { requestIntentSearch } from './request-intent';

describe('intención de crear una solicitud', () => {
  it('admite solamente tareas conocidas y un período de vacaciones válido', () => {
    expect(requestIntentSearch({ create: 'VACATION', period: '2' })).toEqual({
      create: 'VACATION',
      period: 2,
    });
    expect(requestIntentSearch({ create: 'PERMISSION', period: 2 })).toEqual({
      create: 'PERMISSION',
    });
    expect(requestIntentSearch({ create: 'JUSTIFICATION' })).toEqual({
      create: 'JUSTIFICATION',
    });
  });
  it('descarta valores externos o períodos ambiguos sin conceder capacidades', () => {
    for (const create of ['ADMIN', '//otro.test', '', undefined])
      expect(requestIntentSearch({ create, period: 1 })).toEqual({});
    for (const period of [0, -1, 101, 1.2, 'dos', '', null])
      expect(requestIntentSearch({ create: 'VACATION', period })).toEqual({
        create: 'VACATION',
      });
  });
});
