import pino from 'pino';

/**
 * Structured Logger using Pino
 * traces: ADR-013, PRD §8.1
 * Includes PII redaction and environment-based log levels.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'authorization',
      'headers.authorization',
      'apiKey',
      'api_key',
      '*.email',
      '*.phone',
      '*.password'
    ],
    remove: true
  },
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

/**
 * Log requirement traceability
 * @param reqId Requirement ID (FR-## or SM-##)
 * @param message Description
 */
export const trace = (reqId: string, message: string) => {
  logger.debug({ reqId }, `[TRACE] ${message}`);
};
