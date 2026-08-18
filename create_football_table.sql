CREATE TABLE IF NOT EXISTS football_history (
    id SERIAL PRIMARY KEY,
    horario TIMESTAMP NOT NULL,
    home VARCHAR(10) NOT NULL,
    away VARCHAR(10) NOT NULL,
    resultado VARCHAR(1),
    troca_de_baralho BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_football_history_horario ON football_history(horario DESC);
