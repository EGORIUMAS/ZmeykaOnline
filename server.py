# server.py
# Улучшенный мультиплеерный сервер змейки
# pip install flask flask-socketio eventlet python-dotenv

import random
import time
import threading
from collections import deque
from typing import Dict, List
from flask import Flask, render_template, request, send_from_directory
from flask_socketio import SocketIO, join_room, leave_room, emit
import os
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['SECRET_KEY'] = 'snake-secret-key-2025'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Константы игры
BASE_GRID_W = 60
BASE_GRID_H = 30
TICK_MS = 120
MAX_PLAYERS_PER_ROOM = 100  # Неограниченное количество игроков
FIELD_SCALE_THRESHOLD = 8  # Каждые 8 игроков поле увеличивается


class Player:
    def __init__(self, pid: str, sid: str, nickname: str, local_index: int = 0):
        self.id = pid
        self.sid = sid
        self.nickname = nickname
        self.local_index = local_index
        self.snake = deque()
        self.dir = {'x': 1, 'y': 0}
        self.requested_dir = None
        self.score = 0
        self.alive = True
        self.color = None
        self.stroke_active = False
        self.stroke_until = 0.0
        self.stroke_direction = None  # направление при инсульте


class RoomGame:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.players: List[Player] = []
        self.foods: List[Dict] = []
        self.running = False
        self.started = False  # флаг что раунд запущен
        self.lock = threading.RLock()
        self.last_tick = time.time()
        self.tick_interval = TICK_MS / 1000.0
        self._stop = False
        self.bg_task = None
        self.host_sid = None  # создатель комнаты
        self.grid_w = BASE_GRID_W
        self.grid_h = BASE_GRID_H
        self.wins = {}  # Таблица побед

    def add_player(self, player: Player) -> bool:
        with self.lock:
            if len(self.players) < MAX_PLAYERS_PER_ROOM:
                self.players.append(player)
                if self.host_sid is None:
                    self.host_sid = player.sid
                self.update_field_size()
                return True
            return False
    
    def update_field_size(self):
        """Обновляет размер поля в зависимости от количества игроков"""
        player_count = len(self.players)
        scale = player_count // FIELD_SCALE_THRESHOLD
        self.grid_w = BASE_GRID_W * (2 ** scale)
        self.grid_h = BASE_GRID_H * (2 ** scale)

    def remove_player_by_sid(self, sid: str):
        with self.lock:
            removed_was_host = False
            if self.host_sid == sid:
                removed_was_host = True
            self.players = [p for p in self.players if p.sid != sid]
            # Передать хост другому игроку
            if removed_was_host and len(self.players) > 0:
                self.host_sid = self.players[0].sid

    def spawn_food(self, n=1):
        with self.lock:
            for _ in range(n):
                attempts = 0
                while True:
                    attempts += 1
                    if attempts > 200:
                        break
                    x = random.randrange(self.grid_w)
                    y = random.randrange(self.grid_h)
                    occupied = False
                    for p in self.players:
                        if p.alive:
                            for seg in p.snake:
                                if seg['x'] == x and seg['y'] == y:
                                    occupied = True
                                    break
                        if occupied:
                            break
                    if occupied:
                        continue
                    if any(f['x'] == x and f['y'] == y for f in self.foods):
                        continue
                    self.foods.append({'x': x, 'y': y})
                    break

    def start_round(self):
        with self.lock:
            if self.running:
                return False

            # Обновляем размер поля перед стартом
            self.update_field_size()

            slots = [
                (5, 5, {'x': 1, 'y': 0}),
                (self.grid_w - 6, 5, {'x': -1, 'y': 0}),
                (5, self.grid_h - 6, {'x': 1, 'y': 0}),
                (self.grid_w - 6, self.grid_h - 6, {'x': -1, 'y': 0}),
                (self.grid_w // 2, 5, {'x': 0, 'y': 1}),
                (self.grid_w // 2, self.grid_h - 6, {'x': 0, 'y': -1}),
            ]
            colors = [
                {'head': '#7C4DFF', 'body': '#5A31C9', 'particle': 'hsla(270,100%,60%,1)'},
                {'head': '#00C853', 'body': '#007E33', 'particle': 'hsla(140,100%,40%,1)'},
                {'head': '#FF6B35', 'body': '#C44E2C', 'particle': 'hsla(15,100%,60%,1)'},
                {'head': '#00D9FF', 'body': '#0099BB', 'particle': 'hsla(190,100%,50%,1)'},
                {'head': '#FFD93D', 'body': '#C4A000', 'particle': 'hsla(50,100%,60%,1)'},
                {'head': '#FF499E', 'body': '#CC0066', 'particle': 'hsla(330,100%,50%,1)'},
            ]

            for i, p in enumerate(self.players):
                sx, sy, d = slots[i % len(slots)]
                p.snake = deque([{'x': sx, 'y': sy}])
                p.dir = d.copy()
                p.requested_dir = None
                p.score = 0
                p.alive = True
                p.color = colors[i % len(colors)]
                p.stroke_active = False
                p.stroke_until = 0.0
                p.stroke_direction = None

            self.foods = []
            self.spawn_food(max(6, len(self.players) * 2))
            self.running = True
            self.started = True
            self._stop = False

            # Уведомить всех о старте раунда
            socketio.emit('round_started', {}, room=self.room_id)

            self.bg_task = socketio.start_background_task(self._run_loop)
            return True

    def stop(self):
        with self.lock:
            self._stop = True
            self.running = False
            self.started = False

    def _run_loop(self):
        self.last_tick = time.time()
        while True:
            with self.lock:
                if self._stop:
                    break
            now = time.time()
            if now - self.last_tick >= self.tick_interval:
                self.last_tick = now
                try:
                    self.tick()
                except Exception as e:
                    print("Ошибка в тике:", e)
            time.sleep(self.tick_interval / 2.0)

    def tick(self):
        with self.lock:
            for p in list(self.players):
                if not p.alive:
                    continue

                # Проверка истечения инсульта
                if p.stroke_active and time.time() >= p.stroke_until:
                    p.stroke_active = False
                    p.stroke_direction = None
                    if p.sid:
                        socketio.emit('stroke_end', {'player_id': p.id}, room=p.sid)

                # Применить направление
                if p.stroke_active:
                    # Во время инсульта змея двигается в случайном направлении
                    if p.stroke_direction:
                        p.dir = p.stroke_direction
                else:
                    if p.requested_dir:
                        nd = p.requested_dir
                        if not (nd['x'] == -p.dir['x'] and nd['y'] == -p.dir['y']):
                            p.dir = nd
                        p.requested_dir = None

                # Вычислить новую голову
                head = {
                    'x': (p.snake[0]['x'] + p.dir['x']) % self.grid_w,
                    'y': (p.snake[0]['y'] + p.dir['y']) % self.grid_h
                }

                # Проверка коллизий
                collided = False
                for other in self.players:
                    if not other.alive:
                        continue
                    for idx, seg in enumerate(other.snake):
                        if seg['x'] == head['x'] and seg['y'] == head['y']:
                            if other.id == p.id and idx == 0:
                                continue
                            collided = True
                            break
                    if collided:
                        break

                if collided:
                    p.alive = False
                    for seg in p.snake:
                        self.foods.append({'x': seg['x'], 'y': seg['y']})
                    continue

                # Движение
                p.snake.appendleft(head)

                # Проверка поедания
                ate_index = None
                for i, f in enumerate(self.foods):
                    if f['x'] == head['x'] and f['y'] == head['y']:
                        ate_index = i
                        break

                if ate_index is not None:
                    p.score += 10
                    self.foods.pop(ate_index)
                    if p.sid:
                        socketio.emit('ate', {
                            'player_id': p.id,
                            'pos': head,
                            'color': p.color['particle']
                        }, room=p.sid)
                else:
                    if len(p.snake) > 0:
                        p.snake.pop()

                # ОЧЕНЬ редкий инсульт (0.05% шанс = 1 раз в ~2000 тиков)
                # При 120мс тике это ~4 минуты игры
                if not p.stroke_active and random.random() < 0.0005:
                    duration = random.uniform(3.0, 8.0)
                    p.stroke_active = True
                    p.stroke_until = time.time() + duration
                    # Случайное направление для инсульта
                    directions = [
                        {'x': 1, 'y': 0}, {'x': -1, 'y': 0},
                        {'x': 0, 'y': 1}, {'x': 0, 'y': -1}
                    ]
                    p.stroke_direction = random.choice(directions)
                    if p.sid:
                        socketio.emit('stroke_start', {
                            'player_id': p.id,
                            'duration': duration
                        }, room=p.sid)

            # Проверка окончания раунда
            alive = [p for p in self.players if p.alive]
            if len(alive) <= 1 and len(self.players) >= 2:
                scores = {p.id: {'score': p.score, 'nickname': p.nickname} for p in self.players}
                winners = [{'id': p.id, 'nickname': p.nickname} for p in alive]
                
                # Обновляем таблицу побед
                for winner in winners:
                    nick = winner['nickname']
                    self.wins[nick] = self.wins.get(nick, 0) + 1
                
                socketio.emit('round_end', {
                    'scores': scores,
                    'winners': winners,
                    'wins': self.wins
                }, room=self.room_id)
                self.running = False
                self.started = False
                self._stop = True
                return

            # Поддержание еды
            if len(self.foods) < max(4, len(self.players)):
                self.spawn_food(2)

            # Отправка состояния
            snapshot = {
                'players': [
                    {
                        'id': p.id,
                        'nickname': p.nickname,
                        'snake': list(p.snake),
                        'score': p.score,
                        'alive': p.alive,
                        'color': p.color
                    } for p in self.players
                ],
                'foods': list(self.foods),
                'tick': time.time(),
                'grid_w': self.grid_w,
                'grid_h': self.grid_h
            }
            socketio.emit('state', snapshot, room=self.room_id)


rooms: Dict[str, RoomGame] = {}


@app.route('/')
def index():
    ws_host = os.getenv('WEBSOCKET_HOST', 'localhost')
    ws_port = os.getenv('WEBSOCKET_PORT', '8000')
    return render_template('index.html', ws_host=ws_host, ws_port=ws_port)

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)


@socketio.on('create_room')
def handle_create_room(data):
    room = data.get('room', 'default')
    nickname = data.get('nickname', 'Игрок')
    device_type = data.get('device_type', 'desktop')
    local_count = 1 if device_type == 'mobile' else int(data.get('local_count', 1))
    local_count = max(1, min(local_count, 4))

    if room not in rooms:
        rooms[room] = RoomGame(room)

    game = rooms[room]

    if game.started:
        emit('join_failed', {'reason': 'Раунд уже начался'})
        return

    created = []
    with game.lock:
        if len(game.players) + local_count > MAX_PLAYERS_PER_ROOM:
            emit('join_failed', {'reason': 'Комната заполнена'})
            return

        for i in range(local_count):
            pid = f"{request.sid}-{i}"
            player_nick = f"{nickname}" if local_count == 1 else f"{nickname} ({i + 1})"
            p = Player(pid, request.sid, player_nick, i)
            game.add_player(p)
            created.append({
                'id': pid,
                'nickname': player_nick,
                'localIndex': i
            })

    join_room(room)

    # Отправить информацию о присоединении
    emit('joined', {
        'room': room,
        'players': created,
        'is_host': game.host_sid == request.sid
    })

    # Уведомить всех в комнате об обновлении списка игроков
    broadcast_player_list(room)


@socketio.on('start_round')
def handle_start_round(data):
    room = data.get('room')
    game = rooms.get(room)

    if not game:
        emit('error', {'message': 'Комната не найдена'})
        return

    # Только хост может запустить раунд
    if game.host_sid != request.sid:
        emit('error', {'message': 'Только создатель может запустить раунд'})
        return

    if game.start_round():
        socketio.emit('round_starting', {}, room=room)
    else:
        emit('error', {'message': 'Не удалось запустить раунд'})


@socketio.on('input_dir')
def handle_input_dir(data):
    room = data.get('room')
    pid = data.get('player_id')
    nd = data.get('dir')

    game = rooms.get(room)
    if not game or not game.running:
        return

    with game.lock:
        for p in game.players:
            if p.id == pid and p.alive:
                if p.stroke_active:
                    return
                if isinstance(nd, dict) and 'x' in nd and 'y' in nd:
                    p.requested_dir = {'x': int(nd['x']), 'y': int(nd['y'])}
                return


@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    for room_id, game in list(rooms.items()):
        with game.lock:
            game.remove_player_by_sid(sid)
            try:
                leave_room(room_id)
            except:
                pass

            if len(game.players) == 0:
                game.stop()
                del rooms[room_id]
            else:
                broadcast_player_list(room_id)


def broadcast_player_list(room_id):
    game = rooms.get(room_id)
    if not game:
        return

    with game.lock:
        players_data = [
            {
                'id': p.id,
                'nickname': p.nickname,
                'sid': p.sid
            } for p in game.players
        ]
        socketio.emit('players_update', {
            'players': players_data,
            'host_sid': game.host_sid
        }, room=room_id)


if __name__ == '__main__':
    port = int(os.getenv('WEBSOCKET_PORT', '8000'))
    host = os.getenv('WEBSOCKET_HOST', 'localhost')
    print(f"🐍 Сервер змейки запущен на http://{host}:{port}")
    socketio.run(app, host='0.0.0.0', port=port, debug=True)