# Slow-Path — Guía para Natalia

## Tu responsabilidad
Consumir las reservas que Fast-Path bloquea en Redis, "procesar el pago" (simulado),
y persistir el resultado en PostgreSQL de forma ACID. Si algo falla, liberar el lock de Redis.

## Contrato del evento (lo que Fast-Path ya publica)
Cada vez que se bloquea un asiento con éxito, Fast-Path hace:
XADD reservations:pending * seatId <seatId> userId <userId> lockKey <lockKey> ttlMs <ttlMs> timestamp <ms>

Stream: `reservations:pending`
Campos por evento:
- `seatId`: string
- `userId`: string
- `lockKey`: string (ej: `lock:asiento:12`)
- `ttlMs`: número (normalmente 10000)
- `timestamp`: epoch ms de cuando se creó el bloqueo

## Lo que tienes que construir
1. Un consumer group de Redis Streams (`XGROUP CREATE`, `XREADGROUP`) sobre `reservations:pending`.
2. Por cada evento:
   - Simular el pago (puede ser un `await sleep()` + resultado random o siempre exitoso al inicio).
   - Si el pago es exitoso:
     - INSERT en la tabla `reservas` (ver `sql/init.sql`) con `estado = 'confirmada'`.
     - Dejar el lock de Redis como está (expira solo) o eliminarlo si prefieres liberar memoria antes.
   - Si el pago falla o se pasa el TTL sin procesar:
     - `DEL lock:asiento:<seatId>` en Redis para liberar el asiento.
     - INSERT con `estado = 'fallida'`.
3. `XACK` el mensaje del stream al terminar de procesarlo (éxito o fallo controlado).

## Variables de entorno que ya tienes disponibles (via docker-compose)
- `REDIS_URL`
- `DATABASE_URL`
- `RESERVATION_STREAM` = `reservations:pending`
- `CONSUMER_GROUP` = `slow-path-workers`

## Cómo probar en aislado
```bash
docker compose up redis postgres slow-path --build
```

Cualquier duda sobre el formato del evento, coordinamos — no cambies el nombre de los campos sin avisar porque Fast-Path ya los está publicando así.
