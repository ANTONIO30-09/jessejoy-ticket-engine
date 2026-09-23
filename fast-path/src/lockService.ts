import { redis } from "./redisClient";

const LOCK_TTL_MS = Number(process.env.LOCK_TTL_MS || 10000);
const RESERVATION_STREAM = process.env.RESERVATION_STREAM || "reservations:pending";

export interface LockResult {
  success: boolean;
  seatId: string;
  userId: string;
  ttlMs: number;
}

/**
 * Intenta bloquear un asiento de forma atómica.
 * SET lock:asiento:<seatId> <userId> NX PX <ttl>
 * NX = solo si no existe (evita doble venta)
 * PX = expiración en ms (auto-liberación si nadie confirma)
 */
export async function lockSeat(seatId: string, userId: string): Promise<LockResult> {
  const key = `lock:asiento:${seatId}`;

  const result = await redis.set(key, userId, "PX", LOCK_TTL_MS, "NX");

  if (result === "OK") {
    // Publicamos el evento para que el Slow-Path (Natalia) lo procese
    await redis.xadd(
      RESERVATION_STREAM,
      "*",
      "seatId", seatId,
      "userId", userId,
      "lockKey", key,
      "ttlMs", String(LOCK_TTL_MS),
      "timestamp", String(Date.now())
    );

    console.log(`[lock] asiento ${seatId} bloqueado por ${userId} (TTL ${LOCK_TTL_MS}ms)`);
    return { success: true, seatId, userId, ttlMs: LOCK_TTL_MS };
  }

  console.log(`[lock] asiento ${seatId} ya bloqueado, rechazo a ${userId}`);
  return { success: false, seatId, userId, ttlMs: LOCK_TTL_MS };
}

/**
 * Libera el bloqueo manualmente (usado por el Slow-Path si falla el pago,
 * o por endpoints administrativos). Solo libera si el dueño coincide.
 */
export async function releaseSeatLock(seatId: string, userId: string): Promise<boolean> {
  const key = `lock:asiento:${seatId}`;
  const script = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;
  const result = await redis.eval(script, 1, key, userId);
  return result === 1;
}

export async function getLockOwner(seatId: string): Promise<string | null> {
  return redis.get(`lock:asiento:${seatId}`);
}
