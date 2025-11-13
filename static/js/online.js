// Онлайн-режим с Socket.IO
class OnlineGame {
  constructor() {
    this.socket = null;
    this.room = null;
    this.players = [];
    this.myPlayers = [];
    this.isHost = false;
    this.connected = false;
    this.renderer = null;
  }
  
  connect() {
    if (this.socket && this.connected) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(CONFIG.SERVER_URL, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5
        });
        
        this.socket.on('connect', () => {
          console.log('Подключено к серверу');
          this.connected = true;
          resolve();
        });
        
        this.socket.on('connect_error', (error) => {
          console.error('Ошибка подключения:', error);
          this.connected = false;
          reject(error);
        });
        
        this.socket.on('disconnect', () => {
          console.log('Отключено от сервера');
          this.connected = false;
        });
        
        this.setupSocketListeners();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  setupSocketListeners() {
    this.socket.on('joined', (data) => {
      this.room = data.room;
      this.myPlayers = data.players;
      this.isHost = data.is_host;
      
      Storage.save('lastRoom', this.room);
      
      UI.showLobby(this.room, this.isHost);
      UI.updatePlayerList(this.players);
    });
    
    this.socket.on('join_failed', (data) => {
      UI.showError(data.reason);
    });
    
    this.socket.on('players_update', (data) => {
      this.players = data.players;
      this.isHost = data.host_sid === this.socket.id;
      UI.updatePlayerList(this.players);
      UI.updateHostStatus(this.isHost);
    });
    
    this.socket.on('round_starting', () => {
      UI.hideLobby();
      UI.showGame();
      if (this.renderer) {
        this.renderer.start();
      }
    });
    
    this.socket.on('round_started', () => {
      console.log('Раунд начался');
    });
    
    this.socket.on('state', (snapshot) => {
      if (this.renderer) {
        this.renderer.updateState(snapshot);
      }
      
      // Обновляем отображение очков
      if (snapshot.players) {
        UI.updateScores(snapshot.players);
      }
    });
    
    this.socket.on('round_end', (data) => {
      if (this.renderer) {
        this.renderer.stop();
      }
      
      // Обновляем таблицу побед
      if (data.winners && data.winners.length > 0) {
        data.winners.forEach(winner => {
          Storage.addWin(winner.nickname);
        });
      }
      
      // Если есть таблица побед с сервера, объединяем её с локальной
      if (data.wins) {
        const localWins = Storage.loadWins();
        Object.entries(data.wins).forEach(([name, count]) => {
          localWins[name] = Math.max(localWins[name] || 0, count);
        });
        Storage.saveWins(localWins);
      }
      
      UI.showGameOver(data.scores, data.winners);
    });
    
    this.socket.on('ate', (data) => {
      if (this.renderer) {
        this.renderer.createParticles(data.pos.x, data.pos.y, data.color);
      }
    });
    
    this.socket.on('stroke_start', (data) => {
      UI.showStrokeWarning(data.player_id, data.duration);
    });
    
    this.socket.on('stroke_end', (data) => {
      UI.hideStrokeWarning(data.player_id);
    });
  }
  
  createRoom(nickname, localCount = 1) {
    if (!this.connected) {
      return Promise.reject(new Error('Не подключено к серверу'));
    }
    
    const deviceType = isMobile ? 'mobile' : 'desktop';
    
    return new Promise((resolve, reject) => {
      this.socket.emit('create_room', {
        room: this.room || this.generateRoomCode(),
        nickname: nickname,
        device_type: deviceType,
        local_count: localCount
      });
      
      setTimeout(() => {
        if (this.room) {
          resolve(this.room);
        } else {
          reject(new Error('Не удалось создать комнату'));
        }
      }, 1000);
    });
  }
  
  startRound() {
    if (!this.isHost) {
      UI.showError('Только создатель может запустить раунд');
      return;
    }
    
    this.socket.emit('start_round', { room: this.room });
  }
  
  sendDirection(playerId, direction) {
    if (!this.connected || !this.room) return;
    
    this.socket.emit('input_dir', {
      room: this.room,
      player_id: playerId,
      dir: direction
    });
  }
  
  generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
  }
  
  setRenderer(renderer) {
    this.renderer = renderer;
  }
}
