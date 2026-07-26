from db import db
from jwt_helper import jwt_manager
from datetime import datetime, timedelta
import hashlib
import logging
import json

logger = logging.getLogger(__name__)

class SessionService:
    
    @staticmethod
    def create_session(user_id: str, email: str, password: str, access_token: str, refresh_token: str) -> bool:
        """Cria ou atualiza uma sessão com refresh token"""
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
                'ip': 'unknown',
                'refresh_expires': refresh_expires.isoformat()
            })
            
            db.execute(query, (
                user_id,
                email,
                access_token,
                refresh_token,
                password_hash,
                access_expires,
                session_data
            ))
            
            logger.info(f"✅ Sessão salva para {email} (refresh até {refresh_expires})")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao salvar sessão: {e}")
            return False

    @staticmethod
    def get_session_by_refresh_token(refresh_token: str) -> dict:
        """Busca sessão pelo refresh token"""
        try:
            query = """
                SELECT * FROM user_sessions 
                WHERE refresh_token = %s AND is_active = true
            """
            result = db.execute(query, (refresh_token,))
            return result[0] if result else None
        except Exception as e:
            logger.error(f"❌ Erro ao buscar sessão: {e}")
            return None

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
        """Valida access token e retorna sessão"""
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
            logger.info(f"⚠️ Access token expirado para {user_id}")
            return None
        
        return session

    @staticmethod
    def refresh_access_token(refresh_token: str) -> dict:
        """Renova o access token usando refresh token"""
        payload = jwt_manager.verify_token(refresh_token, 'refresh')
        if not payload:
            logger.warning("⚠️ Refresh token inválido")
            return None
        
        user_id = payload.get('user_id')
        email = payload.get('email')
        
        if not user_id or not email:
            return None
        
        session = SessionService.get_session_by_user_id(user_id)
        if not session:
            logger.warning(f"⚠️ Sessão não encontrada para {user_id}")
            return None
        
        if session.get('refresh_token') != refresh_token:
            logger.warning(f"⚠️ Refresh token não coincide para {user_id}")
            return None
        
        session_data = session.get('session_data', {})
        if isinstance(session_data, str):
            session_data = json.loads(session_data)
        
        refresh_expires = session_data.get('refresh_expires')
        if refresh_expires:
            refresh_expires = datetime.fromisoformat(refresh_expires)
            if datetime.now() > refresh_expires:
                logger.warning(f"⚠️ Refresh token expirado para {user_id}")
                SessionService.deactivate_session(user_id)
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
            
            logger.info(f"✅ Access token renovado para {email}")
            
            return {
                'access_token': new_access_token,
                'expires_in': 7 * 24 * 60 * 60,
                'refresh_token': refresh_token
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao renovar access token: {e}")
            return None

    @staticmethod
    def deactivate_session(user_id: str) -> bool:
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

    @staticmethod
    def get_session_data(user_id: str) -> dict:
        session = SessionService.get_session_by_user_id(user_id)
        if not session:
            return None
        
        session_data = session.get('session_data', {})
        if isinstance(session_data, str):
            session_data = json.loads(session_data)
        
        return {
            'user_id': session.get('user_id'),
            'email': session.get('email'),
            'access_token': session.get('access_token'),
            'refresh_token': session.get('refresh_token'),
            'expires_at': session.get('expires_at'),
            'session_data': session_data,
            'is_active': session.get('is_active')
        }

session_service = SessionService()
