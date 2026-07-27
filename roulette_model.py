import json
from datetime import datetime
from db import db
import logging

logger = logging.getLogger(__name__)

class RouletteSpin:
    def __init__(self, number: int, game_id: str = None, raw_data: dict = None):
        self.number = number
        self.game_id = game_id
        self.raw_data = raw_data
        self.color = self.get_color()
        self.parity = self.get_parity()
        self.range = self.get_range()
        self.dozen = self.get_dozen()
        self.column = self.get_column()
        self.timestamp = datetime.now()
        
    def get_color(self) -> str:
        red_numbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]
        if self.number == 0:
            return "green"
        return "red" if self.number in red_numbers else "black"
    
    def get_parity(self) -> str:
        if self.number == 0:
            return "zero"
        return "even" if self.number % 2 == 0 else "odd"
    
    def get_range(self) -> str:
        if self.number == 0:
            return "zero"
        return "low" if self.number <= 18 else "high"
    
    def get_dozen(self) -> str:
        if self.number == 0:
            return "zero"
        elif self.number <= 12:
            return "first"
        elif self.number <= 24:
            return "second"
        else:
            return "third"
    
    def get_column(self) -> str:
        if self.number == 0:
            return "zero"
        elif self.number % 3 == 1:
            return "first"
        elif self.number % 3 == 2:
            return "second"
        else:
            return "third"
    
    def to_dict(self) -> dict:
        return {
            'number': self.number,
            'color': self.color,
            'parity': self.parity,
            'range': self.range,
            'dozen': self.dozen,
            'column': self.column,
            'game_id': self.game_id,
            'timestamp': self.timestamp.isoformat(),
            'raw_data': self.raw_data
        }
    
    def save(self) -> bool:
        """Salva a rodada no banco de dados"""
        try:
            if db is None:
                return False
            
            query = """
                INSERT INTO roulette_spins (
                    number, color, parity, range, dozen, column_pos,
                    game_id, timestamp, raw_data
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            db.execute(query, (
                self.number,
                self.color,
                self.parity,
                self.range,
                self.dozen,
                self.column,
                self.game_id,
                self.timestamp,
                json.dumps(self.raw_data) if self.raw_data else None
            ))
            
            logger.info(f"✅ Rodada {self.number} salva no banco")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao salvar rodada: {e}")
            return False

class RouletteHistory:
    @staticmethod
    def get_last_spins(limit: int = 500, table_id: str = None) -> list:
        """Busca as últimas rodadas do banco"""
        try:
            if db is None:
                return []
            
            query = """
                SELECT * FROM roulette_spins 
                WHERE (%s IS NULL OR table_id = %s)
                ORDER BY timestamp DESC 
                LIMIT %s
            """
            
            result = db.execute(query, (table_id, table_id, limit))
            return result if result else []
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar histórico: {e}")
            return []
    
    @staticmethod
    def get_statistics(limit: int = 100) -> dict:
        """Retorna estatísticas das rodadas"""
        try:
            if db is None:
                return {}
            
            # Últimos números
            query = """
                SELECT number, color, timestamp 
                FROM roulette_spins 
                ORDER BY timestamp DESC 
                LIMIT %s
            """
            last = db.execute(query, (limit,))
            
            # Frequência por número
            query = """
                SELECT number, COUNT(*) as count 
                FROM roulette_spins 
                GROUP BY number 
                ORDER BY count DESC 
                LIMIT 10
            """
            frequency = db.execute(query)
            
            # Estatísticas por cor
            query = """
                SELECT color, COUNT(*) as count 
                FROM roulette_spins 
                GROUP BY color
            """
            colors = db.execute(query)
            
            return {
                'total': len(last) if last else 0,
                'last': last[:10] if last else [],
                'frequency': frequency if frequency else [],
                'colors': colors if colors else []
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar estatísticas: {e}")
            return {}

