import hashlib
import json
import os
from datetime import datetime, timedelta  # 🔥 ADICIONADO timedelta
import secrets
import base64
import logging

logger = logging.getLogger(__name__)

class JWTManager:
    def __init__(self):
        self.secret = os.getenv('JWT_SECRET', 'qa-ai-secret-key-2026')
        self.expires_days = int(os.getenv('JWT_EXPIRES_DAYS', 7))

    def generate_token(self, user_id: str, email: str) -> str:
        expires_at = (datetime.now() + timedelta(days=self.expires_days)).isoformat()

        payload = {
            'user_id': user_id,
            'email': email,
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

    def verify_token(self, token: str) -> dict:
        try:
            if not token.startswith('jwt:'):
                return None

            parts = token.split(':')
            if len(parts) != 3:
                return None

            _, payload_b64, signature = parts

            expected = hashlib.sha256(
                f"{payload_b64}.{self.secret}".encode()
            ).hexdigest()

            if signature != expected:
                logger.warning("⚠️ Assinatura inválida")
                return None

            payload_json = base64.b64decode(payload_b64).decode()
            payload = json.loads(payload_json)

            expires_at = datetime.fromisoformat(payload['expires_at'])
            if datetime.now() > expires_at:
                logger.warning("⚠️ Token expirado (7 dias)")
                return None

            return payload

        except Exception as e:
            logger.error(f"❌ Erro ao verificar token: {e}")
            return None

    def get_expires_at(self) -> datetime:
        return datetime.now() + timedelta(days=self.expires_days)

jwt_manager = JWTManager()
