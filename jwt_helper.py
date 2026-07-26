import hashlib
import json
import os
from datetime import datetime, timedelta
import secrets
import base64
import logging

logger = logging.getLogger(__name__)

class JWTManager:
    def __init__(self):
        self.secret = os.getenv('JWT_SECRET', 'qa-ai-secret-key-2026')
        self.refresh_secret = os.getenv('REFRESH_SECRET', 'qa-ai-refresh-secret-2026')
        self.expires_days = int(os.getenv('JWT_EXPIRES_DAYS', 7))
        self.refresh_expires_days = int(os.getenv('REFRESH_EXPIRES_DAYS', 30))

    def generate_token(self, user_id: str, email: str) -> str:
        """Gera access token (expira em 7 dias)"""
        expires_at = (datetime.now() + timedelta(days=self.expires_days)).isoformat()
        
        payload = {
            'user_id': user_id,
            'email': email,
            'type': 'access',
            'expires_at': expires_at,
            'created_at': datetime.now().isoformat(),
            'nonce': secrets.token_hex(16)
        }
        
        payload_json = json.dumps(payload, separators=(',', ':'))
        payload_b64 = base64.b64encode(payload_json.encode()).decode()
        
        signature = hashlib.sha256(
            f"{payload_b64}.{self.secret}".encode()
        ).hexdigest()
        
        return f"jwt:{payload_b64}:{signature}"

    def generate_refresh_token(self, user_id: str, email: str) -> str:
        """Gera refresh token (expira em 30 dias)"""
        expires_at = (datetime.now() + timedelta(days=self.refresh_expires_days)).isoformat()
        
        payload = {
            'user_id': user_id,
            'email': email,
            'type': 'refresh',
            'expires_at': expires_at,
            'created_at': datetime.now().isoformat(),
            'nonce': secrets.token_hex(16)
        }
        
        payload_json = json.dumps(payload, separators=(',', ':'))
        payload_b64 = base64.b64encode(payload_json.encode()).decode()
        
        signature = hashlib.sha256(
            f"{payload_b64}.{self.refresh_secret}".encode()
        ).hexdigest()
        
        return f"rft:{payload_b64}:{signature}"

    def verify_token(self, token: str, token_type: str = 'access') -> dict:
        """Verifica se o token é válido"""
        try:
            prefix = 'jwt:' if token_type == 'access' else 'rft:'
            secret = self.secret if token_type == 'access' else self.refresh_secret
            
            if not token.startswith(prefix):
                return None
            
            parts = token.split(':')
            if len(parts) != 3:
                return None
            
            _, payload_b64, signature = parts
            
            # Verifica assinatura
            expected = hashlib.sha256(
                f"{payload_b64}.{secret}".encode()
            ).hexdigest()
            
            if signature != expected:
                logger.warning(f"⚠️ Assinatura inválida ({token_type})")
                return None
            
            # Decodifica payload
            payload_json = base64.b64decode(payload_b64).decode()
            payload = json.loads(payload_json)
            
            # Verifica tipo
            if payload.get('type') != token_type:
                logger.warning(f"⚠️ Tipo de token incorreto: esperado {token_type}, recebido {payload.get('type')}")
                return None
            
            # Verifica expiração
            expires_at = datetime.fromisoformat(payload['expires_at'])
            if datetime.now() > expires_at:
                logger.warning(f"⚠️ Token {token_type} expirado")
                return None
            
            return payload
            
        except Exception as e:
            logger.error(f"❌ Erro ao verificar token {token_type}: {e}")
            return None

    def get_expires_at(self, token_type: str = 'access') -> datetime:
        """Retorna data de expiração"""
        days = self.expires_days if token_type == 'access' else self.refresh_expires_days
        return datetime.now() + timedelta(days=days)

jwt_manager = JWTManager()
