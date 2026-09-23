CREATE TABLE IF NOT EXISTS reservas (
  id SERIAL PRIMARY KEY,
  seat_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- pendiente | confirmada | fallida
  creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (seat_id, estado) -- evita doble reserva confirmada del mismo asiento
);
