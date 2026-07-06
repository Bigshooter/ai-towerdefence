export interface HealthData {
  lives: number;
  maxLives: number;
  onLifeLost?: (lives: number) => void;
}

export class HealthSystem {
  private data: HealthData;

  constructor(lives: number = 20, maxLives: number = 20) {
    this.data = { lives, maxLives };
  }

  getLives(): number {
    return this.data.lives;
  }

  getMaxLives(): number {
    return this.data.maxLives;
  }

  loseLife(): boolean {
    if (this.data.lives <= 0) return false;
    this.data.lives--;
    if (this.data.onLifeLost) {
      this.data.onLifeLost(this.data.lives);
    }
    return this.data.lives > 0;
  }

  isGameOver(): boolean {
    return this.data.lives <= 0;
  }

  reset(lives?: number): void {
    this.data.lives = lives ?? this.data.maxLives;
  }

  setOnLifeLost(callback: (lives: number) => void): void {
    this.data.onLifeLost = callback;
  }
}
