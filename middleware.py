from functools import wraps
from flask import request, jsonify
import logging
from session_service import session_service

logger = logging.getLogger(__name__)

def require_auth(f):
    """
    Decorator para proteger rotas que precisam de autenticação
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            auth_header = request.headers.get('Authorization')
            if not auth_header:
                return jsonify({
                    'error': 'Token não fornecido',
                    'code': 'MISSING_TOKEN'
                }), 401

            parts = auth_header.split()
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                return jsonify({
                    'error': 'Formato inválido. Use: Bearer <token>',
                    'code': 'INVALID_FORMAT'
                }), 401

            token = parts[1]

            session = session_service.validate_session(token)
            if not session:
                return jsonify({
                    'error': 'Token inválido ou expirado',
                    'code': 'EV.12'
                }), 401

            request.user_id = session.get('user_id')
            request.user_email = session.get('email')
            request.session_data = session

            return f(*args, **kwargs)

        except Exception as e:
            logger.error(f"❌ Erro no middleware: {e}")
            return jsonify({
                'error': 'Erro interno ao validar token',
                'code': 'SERVER_ERROR'
            }), 500

    return decorated_function
