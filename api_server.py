# [MESMO CÓDIGO ANTERIOR, MAS COM A CORREÇÃO]

# A parte importante é a rota start-game:
@app.route('/api/start-game-v2', methods=['GET'])
@require_auth
def api_start_game():
    try:
        slug = request.args.get('slug')
        print(f"🎮 Gerando link para: {slug}")
        
        if not slug:
            return jsonify({'error': 'slug é obrigatório'}), 400
        
        auth_header = session.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token não encontrado'}), 401
        
        response = session.get(
            f'{API_BASE}/api/start-game-v2',
            params={
                'slug': slug,
                'platform': 'WEB',
                'use_demo': 0,
                'source': 'watchIsAuthenticated'
            },
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            game_url = data.get('iframe_url') or data.get('gameURL')
            
            if game_url:
                import re
                # Extrai EVOSESSIONID
                match = re.search(r'EVOSESSIONID=([^&]+)', game_url)
                if match:
                    evo_session_id = match.group(1)
                    print(f"🔑 EVOSESSIONID extraído: {evo_session_id[:30]}...")
                    
                    # Extrai game_id da URL
                    game_match = re.search(r'game/([^/]+)/', game_url)
                    if game_match:
                        game_id = game_match.group(1)
                        print(f"🎮 Game ID: {game_id}")
                        evolution_ws.game_id = game_id
                    
                    # Conecta WebSocket AUTOMATICAMENTE
                    token = request.headers.get('Authorization', '').replace('Bearer ', '')
                    evolution_ws.set_access_token(token)
                    evolution_ws.set_session_id(evo_session_id)
                    
                    # Força conexão
                    evolution_ws.connect()
                
                return jsonify({
                    'success': True,
                    'slug': slug,
                    'gameURL': game_url,
                    'iframe_url': game_url,
                    'evo_session_id': evo_session_id if 'evo_session_id' in locals() else None
                })
        
        return jsonify({'success': False, 'error': 'Não foi possível gerar o link'}), 404
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500
