import { z } from 'zod';

const EnvSchema = z.object({
  APP_ORIGIN: z
    .url()
    .refine((value) => {
      const url = URL.parse(value);
      return (
        url !== null &&
        ['http:', 'https:'].includes(url.protocol) &&
        url.origin === value
      );
    })
    .default('http://127.0.0.1:5173'),
  ATTENDANCE_WORKER_ENABLED: z.enum(['true', 'false']).optional(),
  ATTENDANCE_EVALUATION_INTERVAL_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(3600)
    .default(60),
  NOTIFICATION_WORKER_ENABLED: z.enum(['true', 'false']).optional(),
  SESSION_HOURS: z.coerce.number().int().min(1).max(24).default(8),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  HOST: z.string().trim().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.url().refine((value) => {
    const url = URL.parse(value);
    return (
      url !== null &&
      ['postgres:', 'postgresql:'].includes(url.protocol) &&
      url.hostname.length > 0 &&
      url.pathname.length > 1
    );
  }),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  APP_TIME_ZONE: z
    .string()
    .refine((value) => {
      try {
        new Intl.DateTimeFormat('es-MX', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    })
    .default('America/Merida'),
});

export function parseConfig(env: Record<string, string | undefined>) {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const fields = [
      ...new Set(parsed.error.issues.map((issue) => issue.path.join('.'))),
    ];
    throw new Error(`Configuración inválida: ${fields.join(', ')}.`);
  }
  const value = parsed.data;
  if (
    value.NODE_ENV === 'production' &&
    !value.APP_ORIGIN.startsWith('https://')
  )
    throw new Error(
      'Configuración inválida: APP_ORIGIN debe usar HTTPS en producción.',
    );
  return {
    appOrigin: value.APP_ORIGIN,
    sessionHours: value.SESSION_HOURS,
    attendanceWorkerEnabled:
      value.ATTENDANCE_WORKER_ENABLED === undefined
        ? value.NODE_ENV !== 'test'
        : value.ATTENDANCE_WORKER_ENABLED === 'true',
    attendanceEvaluationIntervalSeconds:
      value.ATTENDANCE_EVALUATION_INTERVAL_SECONDS,
    notificationWorkerEnabled:
      value.NOTIFICATION_WORKER_ENABLED === undefined
        ? value.NODE_ENV !== 'test'
        : value.NOTIFICATION_WORKER_ENABLED === 'true',
    nodeEnv: value.NODE_ENV,
    host: value.HOST,
    port: value.PORT,
    databaseUrl: value.DATABASE_URL,
    logLevel: value.LOG_LEVEL,
    timeZone: value.APP_TIME_ZONE,
  };
}
export type Config = ReturnType<typeof parseConfig>;
