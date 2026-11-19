import { Type, type Static } from 'typebox';
const Id = Type.String({ format: 'uuid' });
const Instant = Type.String({ format: 'date-time' });
const NullableText = Type.Union([Type.String(), Type.Null()]);
const Snapshot = Type.Union([
  Type.Record(Type.String(), Type.Unknown()),
  Type.Null(),
]);
export const AuditEventSchema = Type.Object(
  {
    id: Id,
    actorId: Type.Union([Id, Type.Null()]),
    actorName: NullableText,
    requestId: Id,
    action: Type.String(),
    entityType: Type.String(),
    entityId: Id,
    before: Snapshot,
    after: Snapshot,
    createdAt: Instant,
  },
  { additionalProperties: false },
);
export const AuditEventListSchema = Type.Object(
  { items: Type.Array(AuditEventSchema), total: Type.Integer({ minimum: 0 }) },
  { additionalProperties: false },
);
export const AuditQuerySchema = Type.Object(
  {
    limit: Type.Optional(
      Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' }),
    ),
    offset: Type.Optional(Type.String({ pattern: '^[0-9]{1,7}$' })),
    entityType: Type.Optional(Type.String({ minLength: 1, maxLength: 64 })),
    action: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  },
  { additionalProperties: false },
);
export const NotificationSchema = Type.Object(
  {
    id: Id,
    title: Type.String(),
    message: Type.String(),
    href: Type.String(),
    createdAt: Instant,
    readAt: Type.Union([Instant, Type.Null()]),
  },
  { additionalProperties: false },
);
export const NotificationListSchema = Type.Object(
  {
    items: Type.Array(NotificationSchema),
    unreadCount: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);
export type AuditEventView = Static<typeof AuditEventSchema>;
export type NotificationView = Static<typeof NotificationSchema>;
