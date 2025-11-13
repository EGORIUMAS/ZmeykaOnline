// Главный файл приложения
let game = null;
let renderer = null;
let controls = null;
let onlineGame = null;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  UI.init();
  createStarField();
  
  // Показываем экран выбора режима
  setTimeout(() => {
    UI.showScreen('mode-selection');
  }, 300);
  
  setupEventListeners();
});

function setupEventListeners() {
  // Оффлайн режим
  document.getElementById('start-offline-btn').addEventListener('click', startOfflineGame);
  
  // Кнопка настроек управления
  const controlsBtn = document.getElementById('controls-settings-btn');
  if (controlsBtn) {
    controlsBtn.addEventListener('click', () => {
      alert('Настройки управления:\n\nИгрок 1: W/A/S/D или Ц/Ф/Ы/В\nИгрок 2: T/F/G/H или Н/П/Р/О\nИгрок 3: I/J/K/L или З/Д/Ж/Э\nИгрок 4: Стрелки\n\nПауза: ` или Ё');
    });
  }
  
  // Кнопка паузы
  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', togglePause);
  }
  
  // Онлайн режим
  document.getElementById('join-room-btn').addEventListener('click', joinOnlineRoom);
  document.getElementById('start-round-btn').addEventListener('click', () => {
    if (onlineGame) {
      onlineGame.startRound();
    }
  });
  
  document.getElementById('leave-room-btn').addEventListener('click', () => {
    if (onlineGame) {
      onlineGame.disconnect();
    }
    UI.showScreen('mode-selection');
  });
  
  // Играть снова
  document.getElementById('play-again-btn').addEventListener('click', () => {
    document.getElementById('game-over').classList.remove('active');
    UI.showScreen('mode-selection');
  });
  
  // Таблица побед
  document.getElementById('show-wins-btn').addEventListener('click', () => {
    const table = document.getElementById('wins-table');
    if (table.style.display === 'none') {
      UI.showWinsTable();
      table.style.display = 'block';
    } else {
      table.style.display = 'none';
    }
  });
  
  // Слайдеры
  document.getElementById('human-players').addEventListener('input', (e) => {
    document.getElementById('human-value').textContent = e.target.value;
  });
  
  document.getElementById('bot-count').addEventListener('input', (e) => {
    document.getElementById('bot-value').textContent = e.target.value;
  });
  
  // Показываем выбор локальных игроков на десктопе
  if (!isMobile) {
    document.getElementById('local-players-group').style.display = 'block';
  }
}

let isPaused = false;

function togglePause() {
  isPaused = !isPaused;
  
  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) {
    pauseBtn.querySelector('span').textContent = isPaused ? '▶' : '⏸';
  }
  
  if (renderer) {
    if (isPaused) {
      renderer.stop();
    } else {
      renderer.start();
    }
  }
  
  console.log(isPaused ? 'Игра на паузе' : 'Игра продолжена');
}

function startOfflineGame() {
  const humanCount = parseInt(document.getElementById('human-players').value);
  const botCount = parseInt(document.getElementById('bot-count').value);
  
  if (humanCount + botCount > CONFIG.MAX_PLAYERS) {
    UI.showError(`Максимум ${CONFIG.MAX_PLAYERS} участников!`);
    return;
  }
  
  UI.showScreen('game-container');
  UI.showGame();
  
  // Создаем рендерер
  renderer = new Renderer('game-board');
  renderer.start();
  
  // Создаем контроллер с поддержкой паузы
  if (!controls) {
    controls = new Controls({
      isRunning: () => renderer && renderer.running && !isPaused,
      changeDirection: (playerIndex, dir) => {
        console.log('Направление изменено:', playerIndex, dir);
      },
      getHumanCount: () => humanCount,
      getPlayerControl: (index) => {
        const controls = ['keyboard1', 'keyboard2', 'keyboard3', 'keyboard4'];
        return controls[index] || 'keyboard1';
      },
      togglePause: togglePause
    });
  }
  
  // Здесь должна быть логика оффлайн игры
  // Пока просто показываем игровое поле
  console.log('Оффлайн игра запущена:', humanCount, 'игроков,', botCount, 'ботов');
}

async function joinOnlineRoom() {
  const nickname = document.getElementById('nickname-input').value.trim();
  const roomCode = document.getElementById('room-input').value.trim().toUpperCase();
  const localCount = parseInt(document.getElementById('local-count').value) || 1;
  
  if (!nickname) {
    UI.showError('Введите ник!');
    return;
  }
  
  if (nickname.length < 2) {
    UI.showError('Ник должен быть не менее 2 символов!');
    return;
  }
  
  // Сохраняем настройки
  Storage.savePlayerSettings(nickname, roomCode, Storage.loadPlayerSettings().controlType);
  
  try {
    // Создаем онлайн игру
    if (!onlineGame) {
      onlineGame = new OnlineGame();
    }
    
    // Подключаемся к серверу
    await onlineGame.connect();
    
    // Создаем рендерер
    if (!renderer) {
      renderer = new Renderer('game-board');
    }
    onlineGame.setRenderer(renderer);
    
    // Создаем контроллер
    if (!controls) {
      controls = new Controls({
        isRunning: () => renderer && renderer.running && !isPaused,
        changeDirection: (playerIndex, dir) => {
          if (onlineGame && onlineGame.myPlayers[playerIndex]) {
            onlineGame.sendDirection(onlineGame.myPlayers[playerIndex].id, dir);
          }
        },
        getHumanCount: () => onlineGame ? onlineGame.myPlayers.length : 0,
        getPlayerControl: () => Storage.loadPlayerSettings().controlType,
        togglePause: togglePause
      });
    }
    
    // Присоединяемся к комнате
    if (roomCode) {
      onlineGame.room = roomCode;
    }
    
    await onlineGame.createRoom(nickname, localCount);
    
  } catch (error) {
    console.error('Ошибка подключения:', error);
    UI.showError('Не удалось подключиться к серверу. Проверьте соединение.');
  }
}

function createStarField() {
  const bg = document.getElementById('floating-bg');
  bg.innerHTML = '';
  
  const starsCount = Math.floor(window.innerWidth * window.innerHeight / 5000);
  
  for (let i = 0; i < starsCount; i++) {
    const star = document.createElement('div');
    star.style.position = 'absolute';
    star.style.background = 'white';
    star.style.borderRadius = '50%';
    
    const size = Math.random() * 3;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.opacity = Math.random() * 0.8 + 0.2;
    star.style.animation = `twinkle ${Math.random() * 4 + 2}s infinite`;
    star.style.animationDelay = `${Math.random() * 4}s`;
    
    bg.appendChild(star);
  }
}

// Анимация мерцания звезд
const style = document.createElement('style');
style.textContent = `
  @keyframes twinkle {
    0%, 100% { opacity: 0.2; }
    50% { opacity: 1; }
  }
`;
document.head.appendChild(style);

window.addEventListener('resize', createStarField);
