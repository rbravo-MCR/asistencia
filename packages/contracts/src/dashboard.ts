import { Type, type Static } from 'typebox';
const strict = { additionalProperties: false };
const Text = Type.String();
const Day = Type.String({ format: 'date' });
const Instant = Type.String({ format: 'date-time' });
const Count = Type.Integer({ minimum: 0 });
export const DashboardShiftSchema = Type.Object(
  {
    id: Text,
    employeeId: Text,
    employeeName: Text,
    workDate: Day,
    startsAt: Instant,
    endsAt: Instant,
    timeZone: Text,
    modality: Text,
    entry: Type.Boolean(),
    exit: Type.Boolean(),
    authorizedAbsence: Type.Boolean(),
    evaluation: Type.Union([Text, Type.Null()]),
    phase: Type.Union([
      Type.Literal('UPCOMING'),
      Type.Literal('IN_PROGRESS'),
      Type.Literal('AWAITING_EVALUATION'),
      Type.Literal('HISTORICAL'),
      Type.Literal('EVALUATED'),
    ]),
  },
  strict,
);
export const DashboardIncidentSchema = Type.Object(
  {
    id: Text,
    employeeId: Text,
    employeeName: Text,
    workDate: Day,
    kind: Text,
    requiresReason: Type.Boolean(),
  },
  strict,
);
export const DashboardRequestSchema = Type.Object(
  {
    id: Text,
    employeeId: Text,
    employeeName: Text,
    kind: Text,
    status: Text,
    fromDate: Day,
    toDate: Day,
    canDecide: Type.Boolean(),
  },
  strict,
);
export const DashboardSchema = Type.Object(
  {
    generatedAt: Instant,
    date: Day,
    timeZone: Text,
    teamVisible: Type.Boolean(),
    unreadNotifications: Count,
    attendance: Type.Object(
      {
        shifts: Type.Array(DashboardShiftSchema),
        incidents: Type.Array(DashboardIncidentSchema),
      },
      strict,
    ),
    personal: Type.Union([
      Type.Null(),
      Type.Object(
        {
          shift: Type.Union([DashboardShiftSchema, Type.Null()]),
          balances: Type.Array(
            Type.Object(
              {
                anniversaryYear: Type.Integer(),
                available: Type.Integer(),
                reserved: Type.Integer(),
              },
              strict,
            ),
          ),
        },
        strict,
      ),
    ]),
    pendingRequests: Type.Array(DashboardRequestSchema),
  },
  strict,
);
export const ConfigurationIssueSchema = Type.Object(
  {
    code: Text,
    title: Text,
    detail: Text,
    count: Count,
    severity: Type.Union([Type.Literal('WARNING'), Type.Literal('INFO')]),
    href: Text,
  },
  strict,
);
export const ConfigurationStatusSchema = Type.Object(
  {
    generatedAt: Instant,
    date: Day,
    timeZone: Text,
    throughDate: Day,
    issues: Type.Array(ConfigurationIssueSchema),
  },
  strict,
);
export type DashboardView = Static<typeof DashboardSchema>;
export type DashboardShift = Static<typeof DashboardShiftSchema>;
export type DashboardIncident = Static<typeof DashboardIncidentSchema>;
export type ConfigurationIssue = Static<typeof ConfigurationIssueSchema>;
export type ConfigurationStatusView = Static<typeof ConfigurationStatusSchema>;
