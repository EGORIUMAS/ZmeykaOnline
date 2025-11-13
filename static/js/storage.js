// Управление локальным хранилищем
class Storage {
  static save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Ошибка сохранения:', e);
    }
  }
  
  static load(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('Ошибка загрузки:', e);
      return defaultValue;
    }
  }
  
  static remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Ошибка удаления:', e);
    }
  }
  
  // Сохранение настроек игрока
  static savePlayerSettings(nickname, room, controlType) {
    this.save('playerNickname', nickname);
    this.save('lastRoom', room);
    this.save('controlType', controlType);
  }
  
  static loadPlayerSettings() {
    return {
      nickname: this.load('playerNickname', 'Игрок'),
      room: this.load('lastRoom', ''),
      controlType: this.load('controlType', isMobile ? 'swipe' : 'keyboard')
    };
  }
  
  // Сохранение таблицы побед
  static saveWins(wins) {
    this.save('playerWins', wins);
  }
  
  static loadWins() {
    return this.load('playerWins', {});
  }
  
  static addWin(playerName) {
    const wins = this.loadWins();
    wins[playerName] = (wins[playerName] || 0) + 1;
    this.saveWins(wins);
  }
}
