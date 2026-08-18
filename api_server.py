from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import logging
import os
import urllib.parse
import time
from datetime import datetime
from db import db
from jwt_helper import jwt_manager
from session_service import session_service
from apigames_service import apigames

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

API_BASE = "https://sortenabet.bet.br"

session = requests.Session()
session.headers.update({
    'Content-Type': 'application/json',
    'Origin': 'https://sortenabet.bet.br',
    'Referer': 'https://sortenabet.bet.br/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Connection': 'keep-alive'
})

cache = {}
CACHE_TTL = 600

def get_cache(key):
    if key in cache:
        data = cache[key]
        if time.time() - data['timestamp'] < CACHE_TTL:
            return data['value']
    return None

def set_cache(key, value):
    cache[key] = {
        'value': value,
        'timestamp': time.time()
    }

SLUG_SOURCE_MAP = {
    'evolution/immersive-roulette': 'immersive',
    'evolution/lightning-roulette': 'lightning',
    'evolution/xxxtreme-lightning-roulette': 'xxxtreme',
    'playtech/roulette': 'brasilPlay',
    'rol;rol_brazilianrol': 'brasilPlay',
}

PLAYTECH_MAP = {
    'rol;rol_brazilianrol': 'playtech/roulette',
}

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    try:
        data = request.json
        email = data.get('login') or data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email e senha sao obrigatorios'}), 400
        
        cached = get_cache(f"login:{email}")
        if cached:
            return jsonify(cached), 200
        
        login_data = {
            "login": email,
            "email": email,
            "password": password,
            "app_source": "web"
        }
        
        response = session.post(f'{API_BASE}/api/auth/login', json=login_data, timeout=5)
        
        if response.status_code != 200:
            return jsonify({'error': 'Credenciais invalidas'}), 401
        
        result = response.json()
        access_token_externo = result.get('access_token')
        
        if not access_token_externo:
            return jsonify({'error': 'Token nao retornado'}), 500
        
        session.headers.update({'Authorization': f'Bearer {access_token_externo}'})
        
        user_id = str(result.get('user', {}).get('id', email))
        jwt_token = jwt_manager.generate_token(user_id, email)
        refresh_token = jwt_manager.generate_refresh_token(user_id, email)
        
        try:
            session_service.create_session(user_id, email, password, jwt_token, refresh_token)
        except:
            pass
        
        apigames.set_email(email)
        apigames.start_polling(interval=2)
        
        response_data = {
            'access_token': jwt_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': 30 * 24 * 60 * 60,
            'user': {
                'id': user_id,
                'name': result.get('user', {}).get('name', email.split('@')[0]),
                'email': email,
                'plan': 'pro'
            }
        }
        
        set_cache(f"login:{email}", response_data)
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/start-game-v2', methods=['GET'])
def api_start_game():
    try:
        slug = request.args.get('slug')
        print(f"Gerando link para: {slug}")
        
        if not slug:
            return jsonify({'error': 'slug obrigatorio'}), 400
        
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token nao encontrado'}), 401
        
        token = auth_header.replace('Bearer ', '')
        payload = jwt_manager.verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Token invalido'}), 401

        # ======================================================
        # 🔥 1. SE FOR PLAYTECH, GERA O LINK DE VIDEO MANUALMENTE
        # ======================================================
        if slug == 'playtech/roulette' or slug == 'rol;rol_brazilianrol':
            print(f"   Playtech detectado. Gerando link de video...")
            
            base_url = "https://cachedownload-cactusbr.onegameslink.com/livedistributed/26.6.3.10/"
            redirect_time = int(time.time() * 1000)
            
            params = {
                "game": "rol",
                "launch_alias": "rol_brazilianrol", 
                "lobby": "https://sortenabet.bet.br",
                "deposit": "https://sortenabet.bet.br/user/wallet",
                "language": "PT-BR",
                "redirect_time": redirect_time,
                "backUrl": "https://login-bramega2.onegameslink.com/",
                "_entry": "live"
            }
            
            query_string = "&".join([f"{k}={urllib.parse.quote(str(v))}" for k, v in params.items()])
            game_url = f"{base_url}?{query_string}"
            
            print(f"   Link de video gerado com sucesso!")
            return jsonify({
                'success': True,
                'slug': slug,
                'gameURL': game_url,
                'iframe_url': game_url
            }), 200

        # ======================================================
        # 🔥 2. SE FOR EVOLUTION, USA A API NORMAL
        # ======================================================
        auth_header_externo = session.headers.get('Authorization')
        if not auth_header_externo:
            return jsonify({'error': 'Token externo nao encontrado'}), 401
        
        api_slug = slug
        if slug in PLAYTECH_MAP:
            api_slug = PLAYTECH_MAP[slug]
            print(f"   Evolution/Slots: {slug} -> {api_slug}")
        
        response = session.get(
            f'{API_BASE}/api/start-game-v2',
            params={
                'slug': api_slug,
                'platform': 'WEB',
                'use_demo': 0,
                'source': 'watchIsAuthenticated'
            },
            timeout=5
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            game_url = data.get('iframe_url') or data.get('gameURL')
            
            if game_url:
                print(f"Link gerado para {api_slug}")
                return jsonify({
                    'success': True,
                    'slug': slug,
                    'gameURL': game_url,
                    'iframe_url': game_url
                }), 200
        
        return jsonify({
            'success': False,
            'error': 'Nao foi possivel obter a URL do jogo'
        }), 404
        
    except Exception as e:
        print(f"Erro: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/roulette/live', methods=['GET'])
def get_live_numbers():
    try:
        slug = request.args.get('slug', '')
        limit = int(request.args.get('limit', 200))
        
        source = SLUG_SOURCE_MAP.get(slug, 'immersive')
        print(f"Buscando numeros para {slug} -> fonte {source}")
        
        if source not in apigames.fontes:
            print(f"Fonte {source} nao inicializada, carregando...")
            apigames.carregar_historico(source)
        
        history = apigames.get_history(source, limit)
        last_numbers = apigames.get_last_numbers(source, 10)
        top_numbers = apigames.get_top_numbers(source, 8)
        total = apigames.get_total(source)
        
        print(f"Total: {total} numeros da fonte {source}")
        
        return jsonify({
            'success': True,
            'connected': apigames.running,
            'total': total,
            'source': source,
            'last_numbers': last_numbers,
            'history': history,
            'top_numbers': top_numbers,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        print(f"Erro: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================================
# 🎯 ROTA DO FOOTBALL STUDIO - HISTORICO
# ============================================================
@app.route('/api/football-studio/history', methods=['GET'])
def get_football_studio_history():
    try:
        logger.info("📊 Buscando historico do Football Studio...")
        response = requests.get('https://app.domcroupier.com/inc/historico.php', timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"✅ {len(data)} registros encontrados")
            return jsonify({
                'success': True,
                'total': len(data),
                'history': data,
                'timestamp': datetime.now().isoformat()
            }), 200
        else:
            logger.error(f"❌ Erro na API externa: {response.status_code}")
            return jsonify({'error': 'Falha ao buscar dados'}), 500
    except Exception as e:
        logger.error(f"❌ Erro no Football Studio: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/validate', methods=['GET'])
def api_validate():
    try:
        auth_header = request.headers.get('Authorization')
        if auth_header:
            return jsonify({'valid': True}), 200
        return jsonify({'valid': False}), 200
    except:
        return jsonify({'valid': False}), 200


@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    apigames.stop_polling()
    try:
        auth_header = request.headers.get('Authorization')
        if auth_header:
            token = auth_header.replace('Bearer ', '')
            payload = jwt_manager.verify_token(token)
            if payload:
                session_service.deactivate_session(payload.get('user_id'))
    except:
        pass
    return jsonify({'success': True}), 200


@app.route('/api/auth/refresh', methods=['POST'])
def api_refresh():
    try:
        data = request.json
        refresh_token = data.get('refresh_token')
        if not refresh_token:
            return jsonify({'error': 'Refresh token nao fornecido'}), 400
        result = session_service.refresh_access_token(refresh_token)
        if not result:
            return jsonify({'error': 'Refresh token invalido'}), 401
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    if path and os.path.exists(os.path.join('dist', path)):
        return send_from_directory('dist', path)
    return send_from_directory('dist', 'index.html')


if __name__ == '__main__':
    print("=" * 70)
    print("API PROXY - PLAYTECH FIX + FOOTBALL STUDIO")
    print("=" * 70)
    print(f"API Base: {API_BASE}")
    print(f"Polling: 2 segundos")
    print(f"Rodando em: http://localhost:5000")
    print("=" * 70)
    print("Mapeamento Playtech:")
    for gamecode, slug in PLAYTECH_MAP.items():
        print(f"   {gamecode} -> {slug}")
    print("=" * 70)
    print("Rotas disponiveis:")
    print("   /api/auth/login")
    print("   /api/start-game-v2")
    print("   /api/roulette/live")
    print("   /api/football-studio/history  🆕")
    print("   /api/auth/validate")
    print("   /api/auth/logout")
    print("   /api/auth/refresh")
    print("=" * 70)
    
    try:
        session_service.cleanup_expired()
    except:
        pass
    
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)

# ========== ROTAS DO FOOTBALL STUDIO COM BANCO ==========
@app.route('/api/football-studio/save', methods=['POST'])
def save_football_history():
    try:
        data = request.json
        history = data.get('history', [])
        
        if not history:
            return jsonify({'error': 'Sem dados'}), 400
        
        saved = 0
        for round in history:
            # Verifica duplicata
            cursor.execute("""
                SELECT id FROM football_history 
                WHERE horario = %s AND home = %s AND away = %s
            """, (round['horario'], round['home'], round['away']))
            
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO football_history 
                    (horario, home, away, resultado, troca_de_baralho)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    round['horario'],
                    round['home'],
                    round['away'],
                    round.get('resultado'),
                    round.get('troca_de_baralho', False)
                ))
                saved += 1
        
        conn.commit()
        print(f"✅ {saved} rodadas salvas no banco")
        
        return jsonify({'success': True, 'saved': saved}), 200
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/football-studio/history', methods=['GET'])
def get_football_history_db():
    try:
        limit = int(request.args.get('limit', 500))
        
        cursor.execute("""
            SELECT horario, home, away, resultado, troca_de_baralho
            FROM football_history
            ORDER BY horario DESC
            LIMIT %s
        """, (limit,))
        
        rows = cursor.fetchall()
        
        history = []
        for row in rows:
            history.append({
                'horario': row[0],
                'home': row[1],
                'away': row[2],
                'resultado': row[3],
                'troca_de_baralho': row[4]
            })
        
        return jsonify({
            'success': True,
            'total': len(history),
            'history': history
        }), 200
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500
