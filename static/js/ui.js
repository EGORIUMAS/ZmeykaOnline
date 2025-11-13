// Управление интерфейсом
class UI {
  static init() {
    this.setupModeSelection();
    this.setupScreenTransitions();
    this.loadSavedSettings();
    this.setupFullscreen();
    this.setupControlTypeSelector();
  }
  
  static setupModeSelection() {
    document.querySelectorAll('.mode-btn').forEach(button => {
      button.addEventListener('click', () => {
        if (button.dataset.mode === 'ghost-main') return;
        
        document.querySelectorAll('.mode-btn, .submode-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        
        button.classList.add('active');
        this.updateSelectedMode(button.dataset.mode);
      });
    });
    
    document.querySelectorAll('.submode-btn').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn, .submode-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        
        button.classList.add('active');
        this.updateSelectedMode(button.dataset.mode);
      });
    });
  }
  
  static setupScreenTransitions() {
    // Переход между экранами
    document.getElementById('btn-offline').addEventListener('click', () => {
      this.showScreen('offline-setup');
    });
    
    document.getElementById('btn-online').addEventListener('click', () => {
      this.showScreen('online-setup');
    });
    
    document.querySelectorAll('.back-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showScreen('mode-selection');
      });
    });
    
    // Поддержка Enter для кнопок
    this.setupEnterKeySupport();
  }
  
  static setupEnterKeySupport() {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      
      // Проверяем активный экран
      const activeScreen = document.querySelector('.screen.active');
      if (!activeScreen) return;
      
      const screenId = activeScreen.id;
      
      // Настройка управления
      if (screenId === 'offline-setup') {
        const controlsBtn = document.getElementById('controls-settings-btn');
        const startBtn = document.getElementById('start-offline-btn');
        
        // Если фокус на кнопке настроек или она видна
        if (document.activeElement === controlsBtn || !document.activeElement || document.activeElement === document.body) {
          if (controlsBtn && controlsBtn.offsetParent !== null) {
            // Пока просто запускаем игру, так как настройки управления не реализованы
            startBtn.click();
          }
        } else {
          startBtn.click();
        }
      }
      
      // Начать игру (онлайн)
      if (screenId === 'online-setup') {
        document.getElementById('join-room-btn').click();
      }
      
      // Продолжить игру (лобби)
      if (screenId === 'lobby-screen') {
        const startRoundBtn = document.getElementById('start-round-btn');
        if (startRoundBtn && startRoundBtn.style.display !== 'none') {
          startRoundBtn.click();
        }
      }
      
      // Играть снова
      const gameOver = document.getElementById('game-over');
      if (gameOver && gameOver.classList.contains('active')) {
        document.getElementById('play-again-btn').click();
      }
    });
  }
  
  static showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
      screen.style.display = 'none';
    });
    
    const screen = document.getElementById(screenId);
    if (screen) {
      screen.style.display = 'flex';
      setTimeout(() => screen.classList.add('active'), 50);
    }
  }
  
  static showLobby(roomCode, isHost) {
    document.getElementById('room-code-display').textContent = roomCode;
    document.getElementById('start-round-btn').style.display = isHost ? 'block' : 'none';
    this.showScreen('lobby-screen');
  }
  
  static hideLobby() {
    document.getElementById('lobby-screen').style.display = 'none';
  }
  
  static showGame() {
    document.getElementById('game-container').style.display = 'block';
  }
  
  static updatePlayerList(players) {
    const list = document.getElementById('players-list');
    list.innerHTML = '';
    
    players.forEach(player => {
      const item = document.createElement('div');
      item.className = 'player-item';
      item.textContent = player.nickname;
      list.appendChild(item);
    });
  }
  
  static updateHostStatus(isHost) {
    const btn = document.getElementById('start-round-btn');
    if (btn) {
      btn.style.display = isHost ? 'block' : 'none';
    }
  }
  
  static showGameOver(scores, winners) {
    const gameOver = document.getElementById('game-over');
    const finalScores = document.getElementById('final-scores');
    const winnerDisplay = document.getElementById('winner');
    
    finalScores.innerHTML = '';
    
    Object.entries(scores).forEach(([id, data]) => {
      const div = document.createElement('div');
      div.textContent = `${data.nickname}: ${data.score}`;
      finalScores.appendChild(div);
    });
    
    if (winners && winners.length > 0) {
      winnerDisplay.textContent = winners.map(w => w.nickname).join(', ');
    } else {
      winnerDisplay.textContent = 'Ничья';
    }
    
    gameOver.classList.add('active');
  }
  
  static showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 3000);
    }
  }
  
  static updateSelectedMode(mode) {
    const modeNames = {
      'classic': 'Классика',
      'half-ghost': 'Полупризрак',
      'family-ghost': 'Семейка недопризраков',
      'full-ghost': 'Полноценный призрак',
      'all-ghosts': 'Компашка призраков',
      'magic-shooter': 'Магический шутер'
    };
    
    const display = document.getElementById('selected-mode-display');
    if (display) {
      display.textContent = modeNames[mode] || 'Классика';
    }
    
    Storage.save('selectedMode', mode);
  }
  
  static loadSavedSettings() {
    const settings = Storage.loadPlayerSettings();
    
    const nicknameInput = document.getElementById('nickname-input');
    if (nicknameInput) {
      nicknameInput.value = settings.nickname;
    }
    
    const roomInput = document.getElementById('room-input');
    if (roomInput) {
      roomInput.value = settings.room;
    }
  }
  
  static setupFullscreen() {
    const btn = document.getElementById('fullscreen-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      });
    }
  }
  
  static setupControlTypeSelector() {
    if (!isMobile && !isTablet) return;
    
    const selector = document.getElementById('control-type-selector');
    if (selector) {
      selector.style.display = 'block';
      
      const settings = Storage.loadPlayerSettings();
      const currentType = settings.controlType;
      
      document.querySelectorAll('input[name="control-type"]').forEach(radio => {
        if (radio.value === currentType) {
          radio.checked = true;
        }
        
        radio.addEventListener('change', (e) => {
          Storage.save('controlType', e.target.value);
        });
      });
    }
  }
  
  static showStrokeWarning(playerId, duration) {
    // Показываем предупреждение об инсульте
    console.log(`Инсульт у игрока ${playerId} на ${duration} секунд`);
  }
  
  static hideStrokeWarning(playerId) {
    console.log(`Инсульт закончился у игрока ${playerId}`);
  }
  
  static showWinsTable() {
    const wins = Storage.loadWins();
    const table = document.getElementById('wins-table');
    
    if (!table) return;
    
    table.innerHTML = '<h3>Таблица побед</h3>';
    
    const sorted = Object.entries(wins).sort((a, b) => b[1] - a[1]);
    
    if (sorted.length === 0) {
      table.innerHTML += '<p style="opacity:0.7;">Пока нет побед</p>';
      return;
    }
    
    sorted.forEach(([name, count]) => {
      const row = document.createElement('div');
      row.className = 'win-row';
      row.innerHTML = `<span>${name}</span><span>${count} 🏆</span>`;
      table.appendChild(row);
    });
  }
  
  static updateScores(players) {
    const scoresDiv = document.getElementById('scores');
    const legendDiv = document.getElementById('legend');
    
    if (!scoresDiv || !legendDiv) return;
    
    scoresDiv.innerHTML = '';
    legendDiv.innerHTML = '';
    
    players.forEach((player, i) => {
      if (!player.alive) return;
      
      const scoreEl = document.createElement('div');
      scoreEl.style.padding = '8px 12px';
      scoreEl.style.background = 'rgba(0,0,0,0.3)';
      scoreEl.style.borderRadius = '8px';
      scoreEl.style.margin = '4px';
      scoreEl.innerHTML = `<strong>${player.nickname}</strong>: ${player.score}`;
      scoresDiv.appendChild(scoreEl);
      
      const legendItem = document.createElement('div');
      legendItem.style.display = 'flex';
      legendItem.style.alignItems = 'center';
      legendItem.style.gap = '8px';
      legendItem.style.padding = '6px 12px';
      legendItem.style.background = 'rgba(0,0,0,0.3)';
      legendItem.style.borderRadius = '8px';
      
      const colorBox = document.createElement('div');
      colorBox.style.width = '14px';
      colorBox.style.height = '14px';
      colorBox.style.borderRadius = '3px';
      colorBox.style.background = player.color.head;
      
      legendItem.appendChild(colorBox);
      legendItem.appendChild(document.createTextNode(player.nickname));
      legendDiv.appendChild(legendItem);
    });
  }
}
