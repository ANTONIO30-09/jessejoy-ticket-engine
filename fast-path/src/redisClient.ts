import Redis from "ioredis";
import { logger } from "./logger";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 2,
  retryStrategy: (times: number) => Math.min(times * 200, 2000)
});

export let redisAvailable = false;

redis.on("connect", () => {
  redisAvailable = true;
  logger.info("redis", "conectado", { url: REDIS_URL });
});

redis.on("error", (err) => {
  logger.error("redis", "error de conexion", { error: err.message });
});

redis.on("reconnecting", (delay: number) => {
  redisAvailable = false;
  logger.warn("redis", "reintentando conexion", { delayMs: delay });
});

redis.on("close", () => {
  redisAvailable = false;
  logger.warn("redis", "conexion cerrada");
});
