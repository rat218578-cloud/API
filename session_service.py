from db import db
from jwt_helper import jwt_manager
from datetime import datetime, timedelta
import hashlib
import logging
import json

logger = logging.getLogger(__name__)

class SessionService:

    @staticmethod
    def create_session(user_id: str, email: str, password: str, access_token: str) -> bool:
        """Cria ou atualiza uma sessão no banco"""
        try:
            expires_at = jwt_manager.get_expires_at()
            password_hash = hashlib.sha256(password.encode()).hexdigest()

            query = """
                INSERT INTO user_sessions (
                    user_id, email, access_token, 
                    password_hash, expires_at, session_data, is_active
                ) VALUES (%s, %s, %s, %s, %s, %s, true)
                ON CONFLICT (user_id) 
                DO UPDATE SET
                    access_token = EXCLUDED.access_token,
                    password_hash = EXCLUDED.password_hash,
                    expires_at = EXCLUDED.expires_at,
                    updated_at = CURRENT_TIMESTAMP,
                    is_active = true
            """

            session_data = json.dumps({
                'login_at': datetime.now().isoformat(),
                'user_agent': 'web',
                'ip': 'unknown'
            })

            db.execute(query, (
                user_id,
                email,
                access_token,
                password_hash,
                expires_at,
                session_data
            ))

            logger.info(f"✅ Sessão salva para {email} (expira em 7 dias)")
            return True

        except Exception as e:
            logger.error(f"❌ Erro ao salvar sessão: {e}")
            return False

    @staticmethod
    def get_session_by_user_id(user_id: str) -> dict:
        """Busca sessão pelo user_id"""
        try:
            query = """
                SELECT * FROM user_sessions 
                WHERE user_id = %s AND is_active = true
            """
            result = db.execute(query, (user_id,))
            return result[0] if result else None
        except Exception as e:
            logger.error(f"❌ Erro ao buscar sessão: {e}")
            return None

    @staticmethod
    def validate_session(token: str) -> dict:
        """Valida se o token é válido"""
        payload = jwt_manager.verify_token(token)
        if not payload:
            return None

        user_id = payload.get('user_id')
        if not user_id:
            return None

        session = SessionService.get_session_by_user_id(user_id)
        if not session:
            return None

        # 🔥 VERIFICA EXPIRAÇÃO (7 DIAS)
        expires_at = session.get('expires_at')
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)

        if datetime.now() > expires_at:
            logger.info(f"⚠️ Sessão expirada para {user_id}")
            SessionService.deactivate_session(user_id)
            return None

        return session

    @staticmethod
    def deactivate_session(user_id: str) -> bool:
        """Desativa uma sessão"""
        try:
            query = """
                UPDATE user_sessions 
                SET is_active = false, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
            """
            db.execute(query, (user_id,))
            logger.info(f"✅ Sessão desativada para {user_id}")
            return True
        except Exception as e:
            logger.error(f"❌ Erro ao desativar sessão: {e}")
            return False

    @staticmethod
    def cleanup_expired() -> int:
        """Remove tokens expirados"""
        try:
            query = """
                UPDATE user_sessions 
                SET is_active = false, updated_at = CURRENT_TIMESTAMP
                WHERE expires_at < NOW() AND is_active = true
            """
            count = db.execute(query)
            logger.info(f"✅ {count} sessões expiradas desativadas")
            return count
        except Exception as e:
            logger.error(f"❌ Erro ao limpar sessões: {e}")
            return 0

session_service = SessionService()
