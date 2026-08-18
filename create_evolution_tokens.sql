CREATE TABLE IF NOT EXISTS evolution_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL UNIQUE,
    evo_session_id VARCHAR(200),
    game_url TEXT,
    slug VARCHAR(100),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_evolution_tokens_user_id ON evolution_tokens(user_id);
