import { redis } from "./redisClient";
import { logger } from "./logger";

const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX || 5);
const WINDOW_SECONDS = Number(process.env.RATE_LIMIT_WINDOW_SEC || 1);

/**
 * Rate limit tipo "fixed window" por userId.
 * Usa INCR + EXPIRE sobre una key que agrupa por ventana de tiempo.
 * Devuelve true si la petición está permitida, false si excede el límite.
 */
export async function checkRateLimit(userId: string): Promise<boolean> {
  const windowId = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  const key = `ratelimit:${userId}:${windowId}`;

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }

  if (count > MAX_REQUESTS) {
    logger.warn("rateLimiter", "limite excedido", { userId, count, max: MAX_REQUESTS });
    return false;
  }

  return true;
}
