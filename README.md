# jessejoy-ticket-engine

POC de venta de entradas en tiempo real sin dobles ventas.

## Arquitectura
- **Fast-Path** (`/fast-path`, responsable: Anton): Node.js + Redis. Bloqueo atómico de asientos (`SET NX PX`). Meta <5ms. Devuelve 200/409.
- **Slow-Path** (`/slow-path`, responsable: Natalia): Node.js Worker + PostgreSQL. Consume el stream de reservas, procesa pago, persiste ACID, libera Redis si falla.

## Contrato entre partes
Ver `slow-path/README.md` — ahí está el formato exacto del evento que Fast-Path publica en Redis Stream `reservations:pending`.

## Levantar todo
```bash
docker compose up --build
```
