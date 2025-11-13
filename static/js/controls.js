// Управление вводом
class Controls {
  constructor(game) {
    this.game = game;
    this.touchStart = {};
    this.currentTouchPlayer = -1;
    this.controlType = Storage.loadPlayerSettings().controlType;
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    if (isMobile || isTablet) {
      const canvas = document.getElementById('game-board');
      
      if (this.controlType === 'swipe') {
        canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
      } else if (this.controlType === 'buttons') {
        this.setupButtonControls();
      }
    }
  }
  
  setupButtonControls() {
    const container = document.getElementById('button-controls');
    if (!container) return;
    
    container.style.display = 'flex';
    
    const buttons = ['up', 'left', 'down', 'right'];
    const directions = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    };
    
    buttons.forEach(dir => {
      const btn = document.getElementById(`btn-${dir}`);
      if (btn) {
        btn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          this.game.changeDirection(0, directions[dir]);
          if (navigator.vibrate) navigator.vibrate(20);
        });
      }
    });
  }
  
  handleKeyDown(e) {
    if (!this.game.isRunning()) return;
    
    const keyMaps = {
      keyboard1: { 'ц': {x:0,y:-1}, 'ы': {x:0,y:1}, 'ф': {x:-1,y:0}, 'в': {x:1,y:0} },
      keyboard2: { 'н': {x:0,y:-1}, 'р': {x:0,y:1}, 'п': {x:-1,y:0}, 'о': {x:1,y:0} },
      keyboard3: { 'з': {x:0,y:-1}, 'ж': {x:0,y:1}, 'д': {x:-1,y:0}, 'э': {x:1,y:0} },
      keyboard4: { 'ArrowUp': {x:0,y:-1}, 'ArrowDown': {x:0,y:1}, 'ArrowLeft': {x:-1,y:0}, 'ArrowRight': {x:1,y:0} }
    };
    
    const humanCount = this.game.getHumanCount();
    for (let i = 0; i < humanCount; i++) {
      const control = this.game.getPlayerControl(i);
      const keyMap = keyMaps[control];
      
      if (keyMap) {
        const key = e.key.toLowerCase();
        const dir = keyMap[key] || keyMap[e.key];
        
        if (dir) {
          this.game.changeDirection(i, dir);
          if (navigator.vibrate && isMobile) navigator.vibrate(20);
        }
      }
    }
  }
  
  handleTouchStart(e) {
    if (!this.game.isRunning()) return;
    
    const touch = e.touches[0];
    const canvas = document.getElementById('game-board');
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    this.touchStart.x = x;
    this.touchStart.y = y;
    this.currentTouchPlayer = 0;
    e.preventDefault();
  }
  
  handleTouchEnd(e) {
    if (!this.game.isRunning() || this.currentTouchPlayer === -1) return;
    
    const touch = e.changedTouches[0];
    const canvas = document.getElementById('game-board');
    const rect = canvas.getBoundingClientRect();
    const endX = touch.clientX - rect.left;
    const endY = touch.clientY - rect.top;
    
    const dx = endX - this.touchStart.x;
    const dy = endY - this.touchStart.y;
    
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) {
      this.currentTouchPlayer = -1;
      return;
    }
    
    let dir = null;
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    } else {
      dir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    }
    
    if (dir) {
      this.game.changeDirection(this.currentTouchPlayer, dir);
      if (navigator.vibrate) navigator.vibrate(30);
    }
    
    this.currentTouchPlayer = -1;
    e.preventDefault();
  }
  
  setControlType(type) {
    this.controlType = type;
    Storage.save('controlType', type);
  }
}
