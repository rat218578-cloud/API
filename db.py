import os
import sys
import logging

# Tenta importar psycopg2 com fallback
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("❌ psycopg2 não instalado. Instalando...")
    os.system("pip install psycopg2-binary")
    import psycopg2
    from psycopg2.extras import RealDictCursor

from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.conn = None
        self.connect()

    def connect(self):
        try:
            database_url = os.getenv('DATABASE_URL')
            if database_url:
                self.conn = psycopg2.connect(database_url)
            else:
                self.conn = psycopg2.connect(
                    host=os.getenv('DB_HOST', 'localhost'),
                    port=os.getenv('DB_PORT', '5432'),
                    dbname=os.getenv('DB_NAME', 'neondb'),
                    user=os.getenv('DB_USER', 'neondb_owner'),
                    password=os.getenv('DB_PASSWORD', '')
                )
            print("✅ Conectado ao PostgreSQL (NeonDB)")
            
            self.create_table_if_not_exists()
            
        except Exception as e:
            print(f"❌ Erro ao conectar: {e}")
            raise

    def create_table_if_not_exists(self):
        query = """
            CREATE TABLE IF NOT EXISTS user_sessions (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) NOT NULL,
                access_token TEXT NOT NULL,
                refresh_token TEXT,
                password_hash TEXT,
                session_data JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                is_active BOOLEAN DEFAULT true
            );
        """
        try:
            self.execute(query)
            print("✅ Tabela user_sessions verificada/criada")
        except Exception as e:
            print(f"❌ Erro ao criar tabela: {e}")

    def execute(self, query, params=None):
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                if query.strip().upper().startswith('SELECT'):
                    return cur.fetchall()
                self.conn.commit()
                return cur.rowcount
        except Exception as e:
            self.conn.rollback()
            logger.error(f"❌ Erro na query: {e}")
            raise

    def close(self):
        if self.conn:
            self.conn.close()
            print("🔌 Conexão fechada")

# Instância global com fallback
try:
    db = Database()
except Exception as e:
    print(f"⚠️ Erro ao conectar: {e}")
    db = None
