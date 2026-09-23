import { Request, Response, NextFunction } from "express";
import { redisAvailable } from "./redisClient";
import { logger } from "./logger";

export function requireRedis(req: Request, res: Response, next: NextFunction) {
  if (!redisAvailable) {
    logger.error("redisHealthMiddleware", "peticion rechazada, redis no disponible", { path: req.path });
    return res.status(503).json({ error: "Servicio no disponible temporalmente, intenta de nuevo" });
  }
  next();
}
