from db import db
from jwt_helper import jwt_manager
from datetime import datetime
import hashlib
import logging
import json

logger = logging.getLogger(__name__)

class SessionService:
    
    @staticmethod
    def create_session(user_id: str, email: str, password: str, access_token: str, refresh_token: str) -> bool:
        try:
            access_expires = jwt_manager.get_expires_at('access')
            refresh_expires = jwt_manager.get_expires_at('refresh')
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            query = """
                INSERT INTO user_sessions (
                    user_id, email, access_token, refresh_token, 
                    password_hash, expires_at, session_data, is_active
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, true)
                ON CONFLICT (user_id) 
                DO UPDATE SET
                    access_token = EXCLUDED.access_token,
                    refresh_token = EXCLUDED.refresh_token,
                    password_hash = EXCLUDED.password_hash,
                    expires_at = EXCLUDED.expires_at,
                    updated_at = CURRENT_TIMESTAMP,
                    is_active = true
            """
            
            session_data = json.dumps({
                'login_at': datetime.now().isoformat(),
                'user_agent': 'web',
                'refresh_expires': refresh_expires.isoformat(),
                'email': email,
                'password_hash': password_hash
            })
            
            db.execute(query, (
                user_id, email, access_token, refresh_token,
                password_hash, access_expires, session_data
            ))
            
            logger.info(f"✅ Sessão salva para {email}")
            return True
        except Exception as e:
            logger.error(f"❌ Erro ao salvar sessão: {e}")
            return False

    @staticmethod
    def get_session_by_user_id(user_id: str) -> dict:
        try:
            query = "SELECT * FROM user_sessions WHERE user_id = %s AND is_active = true"
            result = db.execute(query, (user_id,))
            return result[0] if result else None
        except Exception as e:
            logger.error(f"❌ Erro ao buscar sessão: {e}")
            return None

    @staticmethod
    def validate_session(token: str) -> dict:
        payload = jwt_manager.verify_token(token, 'access')
        if not payload:
            return None
        user_id = payload.get('user_id')
        if not user_id:
            return None
        session = SessionService.get_session_by_user_id(user_id)
        if not session:
            return None
        expires_at = session.get('expires_at')
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if datetime.now() > expires_at:
            logger.info(f"⚠️ Token expirado para {user_id}")
            return None
        return session

    @staticmethod
    def refresh_access_token(refresh_token: str) -> dict:
        payload = jwt_manager.verify_token(refresh_token, 'refresh')
        if not payload:
            return None
        user_id = payload.get('user_id')
        email = payload.get('email')
        if not user_id or not email:
            return None
        session = SessionService.get_session_by_user_id(user_id)
        if not session:
            return None
        if session.get('refresh_token') != refresh_token:
            return None
        
        new_access_token = jwt_manager.generate_token(user_id, email)
        new_expires = jwt_manager.get_expires_at('access')
        
        try:
            query = """
                UPDATE user_sessions 
                SET access_token = %s, expires_at = %s, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
            """
            db.execute(query, (new_access_token, new_expires, user_id))
            return {
                'access_token': new_access_token,
                'expires_in': 7 * 24 * 60 * 60,
                'refresh_token': refresh_token
            }
        except Exception as e:
            logger.error(f"❌ Erro ao renovar token: {e}")
            return None

    @staticmethod
    def deactivate_session(user_id: str) -> bool:
        try:
            query = "UPDATE user_sessions SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = %s"
            db.execute(query, (user_id,))
            return True
        except Exception as e:
            logger.error(f"❌ Erro ao desativar sessão: {e}")
            return False

    @staticmethod
    def cleanup_expired() -> int:
        try:
            query = "UPDATE user_sessions SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE expires_at < NOW() AND is_active = true"
            return db.execute(query)
        except Exception as e:
            logger.error(f"❌ Erro ao limpar sessões: {e}")
            return 0

session_service = SessionService()
