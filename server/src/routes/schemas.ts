import { Type, type Static } from '@sinclair/typebox';

export const SyncStatus = Type.Union([
  Type.Literal('pending'),
  Type.Literal('synced'),
  Type.Literal('error'),
]);

export const Direction = Type.Union([
  Type.Literal('INBOUND'),
  Type.Literal('OUTBOUND'),
]);

export const LogStatus = Type.Union([
  Type.Literal('SUCCESS'),
  Type.Literal('ERROR'),
  Type.Literal('IN_PROGRESS'),
]);


export const AccountResponse = Type.Object({
  id: Type.String({ format: 'uuid' }),
  externalId: Type.Union([Type.String(), Type.Null()]),
  name: Type.String(),
  industry: Type.Union([Type.String(), Type.Null()]),
  annualRevenue: Type.Union([Type.Number(), Type.Null()]),
  billingCity: Type.Union([Type.String(), Type.Null()]),
  syncStatus: SyncStatus,
  lastSyncedAt: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const CreateAccountBody = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 255 }),
  industry: Type.Optional(Type.Union([Type.String({ maxLength: 100 }), Type.Null()])),
  annualRevenue: Type.Optional(Type.Union([Type.Number({ minimum: 0 }), Type.Null()])),
  billingCity: Type.Optional(Type.Union([Type.String({ maxLength: 100 }), Type.Null()])),
});

export const UpdateAccountBody = Type.Partial(CreateAccountBody);

export const ListAccountsQuery = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200, default: 50 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  syncStatus: Type.Optional(SyncStatus),
});

export const ListAccountsResponse = Type.Object({
  data: Type.Array(AccountResponse),
  total: Type.Integer(),
  limit: Type.Integer(),
  offset: Type.Integer(),
});

export type CreateAccountBodyT = Static<typeof CreateAccountBody>;
export type UpdateAccountBodyT = Static<typeof UpdateAccountBody>;
export type ListAccountsQueryT = Static<typeof ListAccountsQuery>;


export const ContactResponse = Type.Object({
  id: Type.String({ format: 'uuid' }),
  externalId: Type.Union([Type.String(), Type.Null()]),
  accountExternalId: Type.Union([Type.String(), Type.Null()]),
  firstName: Type.Union([Type.String(), Type.Null()]),
  lastName: Type.String(),
  email: Type.Union([Type.String(), Type.Null()]),
  syncStatus: SyncStatus,
  lastSyncedAt: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const CreateContactBody = Type.Object({
  firstName: Type.Optional(Type.Union([Type.String({ maxLength: 100 }), Type.Null()])),
  lastName: Type.String({ minLength: 1, maxLength: 100 }),
  email: Type.Optional(Type.Union([Type.String({ format: 'email', maxLength: 255 }), Type.Null()])),
  accountExternalId: Type.Optional(Type.Union([Type.String({ maxLength: 18 }), Type.Null()])),
});

export const ListContactsQuery = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200, default: 50 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  accountExternalId: Type.Optional(Type.String({ maxLength: 18 })),
});

export const ListContactsResponse = Type.Object({
  data: Type.Array(ContactResponse),
  total: Type.Integer(),
  limit: Type.Integer(),
  offset: Type.Integer(),
});

export type CreateContactBodyT = Static<typeof CreateContactBody>;
export type ListContactsQueryT = Static<typeof ListContactsQuery>;


export const SyncLogResponse = Type.Object({
  id: Type.String(),
  correlationId: Type.String(),
  operation: Type.String(),
  direction: Direction,
  objectName: Type.Union([Type.String(), Type.Null()]),
  recordId: Type.Union([Type.String(), Type.Null()]),
  status: LogStatus,
  durationMs: Type.Union([Type.Integer(), Type.Null()]),
  errorMessage: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
});

export const ListSyncLogQuery = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200, default: 50 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  correlationId: Type.Optional(Type.String({ format: 'uuid' })),
  status: Type.Optional(LogStatus),
});

export const ListSyncLogResponse = Type.Object({
  data: Type.Array(SyncLogResponse),
  total: Type.Integer(),
  limit: Type.Integer(),
  offset: Type.Integer(),
});

export const SyncMetricsResponse = Type.Object({
  totalToday: Type.Integer(),
  successToday: Type.Integer(),
  errorsToday: Type.Integer(),
  successRatePct: Type.Integer(),
  avgDurationMs: Type.Union([Type.Integer(), Type.Null()]),
});

export type ListSyncLogQueryT = Static<typeof ListSyncLogQuery>;


export const IdParam = Type.Object({
  id: Type.String({ format: 'uuid' }),
});
export type IdParamT = Static<typeof IdParam>;