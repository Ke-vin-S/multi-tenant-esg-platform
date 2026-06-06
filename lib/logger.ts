import winston from 'winston';

const REDACT_KEYS = new Set([
  'password', 'token', 'secret', 'authorization',
  'id_token', 'idToken', 'SECRET_HASH', 'accessToken', 'refreshToken',
]);

function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 2) return '***@***';
  return `${email.slice(0, 2)}***${email.slice(at)}`;
}

export function sanitize<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj } as Record<string, unknown>;
  for (const key of Object.keys(out)) {
    if (REDACT_KEYS.has(key)) {
      out[key] = '[REDACTED]';
    } else if (key === 'email' && typeof out[key] === 'string') {
      out[key] = maskEmail(out[key] as string);
    }
  }
  return out as T;
}

const isDev = process.env.NODE_ENV !== 'production';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  format: isDev
    ? winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
          return `${timestamp} ${level}: ${message}${extra}`;
        }),
      )
    : winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
  defaultMeta: { service: 'esg-platform' },
  transports: [new winston.transports.Console()],
});

export default logger;

/** Creates a child logger bound to a single request's context. */
export function requestLogger(req: Request, extra?: Record<string, unknown>) {
  const requestId = (req.headers.get('x-request-id') ?? crypto.randomUUID()).slice(0, 8);
  return logger.child({ requestId, ...extra });
}
