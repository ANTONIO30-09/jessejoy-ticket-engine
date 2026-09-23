import Redis from "ioredis";
import { Pool } from "pg";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const DATABASE_URL = process.env.DATABASE_URL || "postgres://jessejoy:jessejoy_pass@localhost:5432/jessejoy_tickets";
const STREAM = process.env.RESERVATION_STREAM || "reservations:pending";
const GROUP = process.env.CONSUMER_GROUP || "slow-path-workers";
const CONSUMER_NAME = `worker-${process.pid}`;

const redis = new Redis(REDIS_URL);
const pool = new Pool({ connectionString: DATABASE_URL });

function log(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    context: "slow-path",
    message,
    ...(meta ? { meta } : {})
  }));
}

async function ensureGroup() {
  try {
    await redis.xgroup("CREATE", STREAM, GROUP, "0", "MKSTREAM");
    log("info", "grupo de consumidores creado", { group: GROUP });
  } catch (err: any) {
    if (String(err.message).includes("BUSYGROUP")) {
      log("info", "grupo de consumidores ya existe", { group: GROUP });
    } else {
      throw err;
    }
  }
}

// Simulación de pago: 90% de éxito. Reemplazar con integración real cuando aplique.
function simulatePayment(): boolean {
  return Math.random() < 0.9;
}

async function processMessage(id: string, fields: string[]) {
  const data: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    data[fields[i]] = fields[i + 1];
  }

  const { seatId, userId, lockKey } = data;
  log("info", "procesando reserva", { id, seatId, userId });

  const paymentOk = simulatePayment();
  const client = await pool.connect();

  try {
    if (paymentOk) {
      await client.query(
        `INSERT INTO reservas (seat_id, user_id, estado) VALUES ($1, $2, 'confirmada')`,
        [seatId, userId]
      );
      log("info", "pago confirmado, reserva persistida", { seatId, userId });
    } else {
      if (lockKey) {
        await redis.del(lockKey);
      }
      await client.query(
        `INSERT INTO reservas (seat_id, user_id, estado) VALUES ($1, $2, 'fallida')`,
        [seatId, userId]
      );
      log("warn", "pago fallido, asiento liberado", { seatId, userId });
    }
  } finally {
    client.release();
  }

  await redis.xack(STREAM, GROUP, id);
}

async function consumeLoop() {
  while (true) {
    try {
      const res: any = await redis.xreadgroup(
        "GROUP", GROUP, CONSUMER_NAME,
        "COUNT", 10,
        "BLOCK", 5000,
        "STREAMS", STREAM, ">"
      );

      if (!res) continue;

      for (const [, messages] of res) {
        for (const [id, fields] of messages) {
          try {
            await processMessage(id, fields);
          } catch (err: any) {
            log("error", "error procesando mensaje", { id, error: err.message });
          }
        }
      }
    } catch (err: any) {
      log("error", "error en consumo del stream", { error: err.message });
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function main() {
  await ensureGroup();
  log("info", "worker iniciado", { consumer: CONSUMER_NAME });
  await consumeLoop();
}

main().catch((err) => {
  log("error", "fallo fatal", { error: err.message });
  process.exit(1);
});
