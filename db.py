import os
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool
from datetime import datetime
import logging
from dotenv import load_dotenv
import time

load_dotenv()

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.conn = None
        self.max_retries = 3
        self.retry_delay = 1
        self.connect()

    def connect(self):
        """Conecta ao PostgreSQL com retry"""
        for attempt in range(self.max_retries):
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
                
                # Configurações para manter conexão viva
                self.conn.autocommit = False
                self.conn.set_session(autocommit=False)
                
                logger.info(f"✅ Conectado ao PostgreSQL (NeonDB) - tentativa {attempt + 1}")
                
                # Cria tabela se não existir
                self.create_table_if_not_exists()
                return
                
            except Exception as e:
                logger.error(f"❌ Erro ao conectar (tentativa {attempt + 1}/{self.max_retries}): {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
                else:
                    raise

    def ensure_connection(self):
        """Verifica e reconecta se necessário"""
        try:
            # Testa se a conexão está viva
            if self.conn:
                with self.conn.cursor() as cur:
                    cur.execute("SELECT 1")
            else:
                self.connect()
        except Exception as e:
            logger.warning(f"⚠️ Conexão perdida, reconectando... {e}")
            self.connect()

    def create_table_if_not_exists(self):
        """Cria a tabela user_sessions se não existir"""
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
            logger.info("✅ Tabela user_sessions verificada/criada")
        except Exception as e:
            logger.error(f"❌ Erro ao criar tabela: {e}")

    def execute(self, query, params=None):
        """Executa uma query com reconexão automática"""
        self.ensure_connection()
        
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                if query.strip().upper().startswith('SELECT'):
                    result = cur.fetchall()
                    # Mantém conexão aberta
                    self.conn.commit()
                    return result
                self.conn.commit()
                return cur.rowcount
        except psycopg2.OperationalError as e:
            logger.error(f"❌ Erro operacional: {e}")
            # Tenta reconectar e executar novamente
            self.connect()
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                if query.strip().upper().startswith('SELECT'):
                    result = cur.fetchall()
                    self.conn.commit()
                    return result
                self.conn.commit()
                return cur.rowcount
        except Exception as e:
            self.conn.rollback()
            logger.error(f"❌ Erro na query: {e}")
            raise

    def close(self):
        """Fecha conexão"""
        if self.conn:
            self.conn.close()
            logger.info("🔌 Conexão fechada")

# Instância global
try:
    db = Database()
except Exception as e:
    logger.error(f"❌ Erro ao criar instância do banco: {e}")
    db = None
