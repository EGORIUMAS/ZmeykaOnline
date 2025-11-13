// Рендеринг игры
class Renderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.state = null;
    this.running = false;
    this.gridW = CONFIG.GRID_W;
    this.gridH = CONFIG.GRID_H;
    this.gridSize = CONFIG.GRID_SIZE;
    
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }
  
  resizeCanvas() {
    const container = this.canvas.parentElement;
    const displayWidth = container.clientWidth;
    const displayHeight = displayWidth * (this.gridH / this.gridW);
    
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;
    this.canvas.width = this.gridW * this.gridSize;
    this.canvas.height = this.gridH * this.gridSize;
  }
  
  updateFieldSize(playerCount) {
    // Увеличиваем поле каждые 8 игроков
    const scale = Math.floor(playerCount / CONFIG.FIELD_SCALE_THRESHOLD);
    this.gridW = CONFIG.GRID_W * Math.pow(2, scale);
    this.gridH = CONFIG.GRID_H * Math.pow(2, scale);
    this.resizeCanvas();
  }
  
  start() {
    this.running = true;
    this.loop();
  }
  
  stop() {
    this.running = false;
  }
  
  loop() {
    if (!this.running) return;
    
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
  
  updateState(state) {
    this.state = state;
    
    // Обновляем размер поля из состояния сервера
    if (state.grid_w && state.grid_h) {
      this.gridW = state.grid_w;
      this.gridH = state.grid_h;
      this.resizeCanvas();
    }
  }
  
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawGrid();
    this.drawParticles();
    
    if (this.state) {
      this.drawFood();
      this.drawSnakes();
    }
  }
  
  drawGrid() {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    this.ctx.lineWidth = 1;
    
    for (let x = 0; x <= this.canvas.width; x += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    
    for (let y = 0; y <= this.canvas.height; y += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }
  
  drawSnakes() {
    if (!this.state || !this.state.players) return;
    
    this.state.players.forEach(player => {
      if (!player.alive || !player.snake || player.snake.length === 0) return;
      
      const color = player.color;
      
      player.snake.forEach((seg, i) => {
        const isHead = i === 0;
        this.ctx.fillStyle = isHead ? color.head : color.body;
        
        this.ctx.beginPath();
        this.roundRect(
          seg.x * this.gridSize + 1.5,
          seg.y * this.gridSize + 1.5,
          this.gridSize - 3,
          this.gridSize - 3,
          4
        );
        this.ctx.fill();
        
        // Рисуем глаза на голове
        if (isHead) {
          this.drawEyes(seg, color);
        }
      });
    });
  }
  
  drawEyes(head, color) {
    this.ctx.fillStyle = 'white';
    this.ctx.beginPath();
    
    const eyeOffset = 5;
    const eyeX1 = head.x * this.gridSize + eyeOffset;
    const eyeY1 = head.y * this.gridSize + eyeOffset;
    const eyeX2 = head.x * this.gridSize + this.gridSize - eyeOffset;
    const eyeY2 = head.y * this.gridSize + eyeOffset;
    
    this.ctx.arc(eyeX1, eyeY1, 2, 0, Math.PI * 2);
    this.ctx.arc(eyeX2, eyeY2, 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.fillStyle = 'black';
    this.ctx.beginPath();
    this.ctx.arc(eyeX1, eyeY1, 0.8, 0, Math.PI * 2);
    this.ctx.arc(eyeX2, eyeY2, 0.8, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  drawFood() {
    if (!this.state || !this.state.foods) return;
    
    this.state.foods.forEach(f => {
      const pulseSize = 4 + Math.sin(Date.now() / 200) * 2;
      
      this.ctx.fillStyle = '#FF5252';
      this.ctx.beginPath();
      this.ctx.arc(
        (f.x + 0.5) * this.gridSize,
        (f.y + 0.5) * this.gridSize,
        pulseSize,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
      
      // Блик
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      this.ctx.beginPath();
      this.ctx.arc(
        (f.x + 0.5) * this.gridSize - 1,
        (f.y + 0.5) * this.gridSize - 1,
        1.5,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    });
  }
  
  drawParticles() {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      
      if (p.life <= 0) return false;
      
      const alpha = p.life / p.maxLife;
      let color = p.color;
      
      if (color.includes('hsla')) {
        color = color.replace(/[\d.]+\)$/, `${alpha})`);
      } else if (color.includes('hsl')) {
        color = color.replace(')', `, ${alpha})`).replace('hsl', 'hsla');
      }
      
      const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 3);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
      
      return true;
    });
  }
  
  createParticles(x, y, color) {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1 + Math.random() * 3;
      
      this.particles.push({
        x: (x + 0.5) * this.gridSize,
        y: (y + 0.5) * this.gridSize,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 25,
        maxLife: 25,
        color: color
      });
    }
  }
  
  roundRect(x, y, width, height, radius) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.arcTo(x + width, y, x + width, y + height, radius);
    this.ctx.arcTo(x + width, y + height, x, y + height, radius);
    this.ctx.arcTo(x, y + height, x, y, radius);
    this.ctx.arcTo(x, y, x + width, y, radius);
    this.ctx.closePath();
    
    return this.ctx;
  }
}
