import { Router, Request, Response } from "express";
import { lockSeat, getLockOwner, releaseSeatLock } from "../lockService";
import { checkRateLimit } from "../rateLimiter";

export const reservationRouter = Router();

/**
 * POST /reservas/:seatId
 * body: { userId: string }
 * 200 -> bloqueo exitoso (10s para confirmar pago vía Slow-Path)
 * 409 -> asiento ya bloqueado por otro usuario
 * 400 -> falta userId
 * 429 -> demasiadas peticiones del mismo usuario
 */
reservationRouter.post("/reservas/:seatId", async (req: Request, res: Response) => {
  const { seatId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId es requerido" });
  }

  try {
    const allowed = await checkRateLimit(userId);
    if (!allowed) {
      return res.status(429).json({ error: "Demasiadas peticiones, intenta de nuevo en un momento" });
    }

    const result = await lockSeat(seatId, userId);

    if (result.success) {
      return res.status(200).json({
        status: "bloqueado",
        seatId,
        userId,
        ttlMs: result.ttlMs
      });
    }

    return res.status(409).json({
      status: "conflicto",
      seatId,
      message: "El asiento ya está bloqueado"
    });
  } catch (err) {
    console.error("[reservas] error:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 * GET /reservas/:seatId/estado
 * Consulta quién tiene el bloqueo actualmente (debug/monitoring)
 */
reservationRouter.get("/reservas/:seatId/estado", async (req: Request, res: Response) => {
  const { seatId } = req.params;
  try {
    const owner = await getLockOwner(seatId);
    return res.status(200).json({ seatId, bloqueadoPor: owner || null });
  } catch (err) {
    console.error("[reservas] error:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 * DELETE /reservas/:seatId
 * body: { userId: string }
 * Libera el bloqueo, pero SOLO si el userId coincide con el dueño actual
 * 200 -> liberado
 * 403 -> el userId no es el dueño del bloqueo
 * 404 -> no había bloqueo activo
 */
reservationRouter.delete("/reservas/:seatId", async (req: Request, res: Response) => {
  const { seatId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId es requerido" });
  }

  try {
    const owner = await getLockOwner(seatId);

    if (!owner) {
      return res.status(404).json({ status: "no_existe", seatId, message: "No hay bloqueo activo" });
    }

    const released = await releaseSeatLock(seatId, userId);

    if (released) {
      return res.status(200).json({ status: "liberado", seatId, userId });
    }

    return res.status(403).json({
      status: "prohibido",
      seatId,
      message: "El userId no coincide con el dueño del bloqueo"
    });
  } catch (err) {
    console.error("[reservas] error:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});
