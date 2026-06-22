import winston from "winston";

const level = process.env.LOG_LEVEL ?? "info";

export const logger = winston.createLogger({
  level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});

export function logAuth(action: string, username: string, meta: Record<string, unknown> = {}): void {
  logger.info("auth", { action, username, ...meta });
}

export function logError(message: string, error: unknown, meta: Record<string, unknown> = {}): void {
  logger.error(message, {
    ...(error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { error }),
    ...meta,
  });
}
