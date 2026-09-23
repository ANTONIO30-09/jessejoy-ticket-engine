type Level = "info" | "warn" | "error";

function timestamp(): string {
  return new Date().toISOString();
}

function log(level: Level, context: string, message: string, meta?: Record<string, unknown>) {
  const entry = {
    timestamp: timestamp(),
    level,
    context,
    message,
    ...(meta ? { meta } : {})
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (context: string, message: string, meta?: Record<string, unknown>) =>
    log("info", context, message, meta),
  warn: (context: string, message: string, meta?: Record<string, unknown>) =>
    log("warn", context, message, meta),
  error: (context: string, message: string, meta?: Record<string, unknown>) =>
    log("error", context, message, meta)
};
