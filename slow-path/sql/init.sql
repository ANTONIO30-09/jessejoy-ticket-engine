CREATE TABLE IF NOT EXISTS reservas (
  id SERIAL PRIMARY KEY,
  seat_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservas_seat_id ON reservas(seat_id);
