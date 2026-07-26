import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
import hashlib
import json
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.conn = None
        self.connect()

    def connect(self):
        """Conecta ao PostgreSQL"""
        try:
            self.conn = psycopg2.connect(
                host=os.getenv('DB_HOST', 'localhost'),
                port=os.getenv('DB_PORT', '5432'),
                dbname=os.getenv('DB_NAME', 'qa_ai_db'),
                user=os.getenv('DB_USER', 'postgres'),
                password=os.getenv('DB_PASSWORD', '')
            )
            logger.info("✅ Conectado ao PostgreSQL")
        except Exception as e:
            logger.error(f"❌ Erro ao conectar: {e}")
            raise

    def execute(self, query, params=None):
        """Executa uma query e retorna os resultados"""
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
        """Fecha conexão"""
        if self.conn:
            self.conn.close()
            logger.info("🔌 Conexão fechada")

# Instância global
db = Database()
