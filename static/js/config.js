// Конфигурация игры
const CONFIG = {
  GRID_W: 60,
  GRID_H: 30,
  GRID_SIZE: 20,
  TICK_MS: 120,
  MAX_PLAYERS: 8,
  MAX_PLAYERS_PER_ROOM: 12,
  FIELD_SCALE_THRESHOLD: 8, // Каждые 8 игроков поле увеличивается
  SERVER_URL: 'https://zmeyka.cloudpub.ru',
  
  COLORS: [
    { head: '#7C4DFF', body: '#5A31C9', particle: 'hsla(270,100%,60%,1)' },
    { head: '#00C853', body: '#007E33', particle: 'hsla(140,100%,40%,1)' },
    { head: '#FF6B35', body: '#C44E2C', particle: 'hsla(15,100%,60%,1)' },
    { head: '#00D9FF', body: '#0099BB', particle: 'hsla(190,100%,50%,1)' },
    { head: '#FFD93D', body: '#C4A000', particle: 'hsla(50,100%,60%,1)' },
    { head: '#FF499E', body: '#CC0066', particle: 'hsla(330,100%,50%,1)' },
    { head: '#4CAF50', body: '#388E3C', particle: 'hsla(120,100%,50%,1)' },
    { head: '#2196F3', body: '#0D47A1', particle: 'hsla(200,100%,50%,1)' }
  ],
  
  BOT_STRATEGIES: {
    AGGRESSIVE: 0,
    CAUTIOUS: 1,
    RANDOM: 2,
    TERRITORIAL: 3,
    HUNTER: 4
  },
  
  SPECIAL_EFFECTS: {
    WEAPON: 0,
    INVULNERABILITY: 1,
    DIARRHEA: 2
  }
};

// Проверка мобильного устройства
const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
const isTablet = isMobile && Math.min(window.innerWidth, window.innerHeight) >= 768;
