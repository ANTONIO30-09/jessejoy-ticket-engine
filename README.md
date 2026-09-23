# jessejoy-ticket-engine

POC de venta de entradas en tiempo real sin dobles ventas.

## Arquitectura

- **Fast-Path** (`/fast-path`, responsable: Anton): Node.js + Redis. Bloqueo atómico de asientos (`SET NX PX`), meta <5ms. Devuelve 200 (bloqueado) / 409 (conflicto) / 429 (rate limit) / 503 (Redis caído). Publica cada bloqueo exitoso en el stream `reservations:pending`.
- **Slow-Path** (`/slow-path`, responsable: Natalia): Node.js Worker + PostgreSQL. Consumer group sobre Redis Streams, procesa el pago (simulado), persiste el resultado de forma ACID en la tabla `reservas`, y libera el lock de Redis si el pago falla.
- **Frontend** (`/frontend`): página simple en HTML/CSS/JS vanilla, grilla de 30 asientos, permite bloquear/liberar en tiempo real contra el Fast-Path.

## Estado

Ambas partes están completas y probadas end-to-end:

- Fast-Path: atomicidad verificada bajo concurrencia real (locust de 50 conexiones simultáneas), latencia <5ms en operación aislada, ~11-20ms de latencia total bajo carga con autocannon, ~98.8% de éxito en pruebas de carga con asientos/usuarios únicos, resiliencia ante caída de Redis (503 inmediato + recuperación automática), rate limiting (5 req/seg por usuario), validación estricta de input.
- Slow-Path: worker probado contra el stream real, consumer group con `XREADGROUP`/`XACK`, más de 14.000 eventos procesados en pruebas (12.860 confirmados, 1.469 fallidos con liberación de Redis), persistencia verificada en PostgreSQL.

## Contrato entre partes

Ver `slow-path/README.md` — ahí está el formato exacto del evento que Fast-Path publica en el stream `reservations:pending` (`seatId`, `userId`, `lockKey`, `ttlMs`, `timestamp`).

## Levantar todo

```bash
docker compose up --build -d
```

Servicios: `redis` (6379), `postgres` (55432 → 5432 interno), `fast-path` (3000), `slow-path` (worker, sin puerto expuesto).

## Probar el Fast-Path

```bash
curl -X POST http://localhost:3000/reservas/12 -H "Content-Type: application/json" -d '{"userId":"anton"}'
```

Endpoints: `POST /reservas/:seatId`, `GET /reservas/:seatId/estado`, `DELETE /reservas/:seatId`.

## Ver el frontend

```bash
cd frontend
python3 -m http.server 8081
```

Abrir `http://localhost:8081` (con `fast-path` corriendo en el puerto 3000).

## Verificar resultados en PostgreSQL

```bash
docker exec -it jessejoy-postgres psql -U jessejoy -d jessejoy_tickets -c "SELECT estado, COUNT(*) FROM reservas GROUP BY estado;"
```

## Stack
Node.js (TypeScript), Redis (ioredis, Streams), PostgreSQL, Docker Compose, HTML/CSS/JS vanilla.
