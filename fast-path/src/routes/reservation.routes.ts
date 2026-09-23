import { Router, Request, Response } from "express";
import { lockSeat, getLockOwner } from "../lockService";

export const reservationRouter = Router();

/**
 * POST /reservas/:seatId
 * body: { userId: string }
 * 200 -> bloqueo exitoso (10s para confirmar pago vía Slow-Path)
 * 409 -> asiento ya bloqueado por otro usuario
 * 400 -> falta userId
 */
reservationRouter.post("/reservas/:seatId", async (req: Request, res: Response) => {
  const { seatId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId es requerido" });
  }

  try {
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
