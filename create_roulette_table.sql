-- Tabela para armazenar rodadas da roleta
CREATE TABLE IF NOT EXISTS roulette_spins (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(100) NOT NULL,
    number INTEGER NOT NULL,
    color VARCHAR(10) NOT NULL,
    parity VARCHAR(10) NOT NULL,
    range VARCHAR(20) NOT NULL,
    dozen VARCHAR(20) NOT NULL,
    column_pos VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_data JSONB,
    table_id VARCHAR(50)
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_roulette_spins_timestamp ON roulette_spins(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_roulette_spins_number ON roulette_spins(number);
CREATE INDEX IF NOT EXISTS idx_roulette_spins_game_id ON roulette_spins(game_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

ALTER TABLE roulette_spins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

DROP TRIGGER IF EXISTS update_roulette_spins_updated_at ON roulette_spins;
CREATE TRIGGER update_roulette_spins_updated_at
    BEFORE UPDATE ON roulette_spins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
