export class EconomySystem {
  private gold: number;
  private startingGold: number = 150;
  private periodicIncomeTimer: number = 0;
  private periodicIncomeInterval: number = 10; // seconds
  private periodicIncomeAmount: number = 10;

  constructor(startingGold?: number) {
    this.gold = startingGold ?? this.startingGold;
  }

  getGold(): number {
    return this.gold;
  }

  addGold(amount: number): void {
    this.gold += amount;
  }

  spendGold(amount: number): boolean {
    if (this.gold >= amount) {
      this.gold -= amount;
      return true;
    }
    return false;
  }

  update(dt: number): void {
    this.periodicIncomeTimer += dt;
    if (this.periodicIncomeTimer >= this.periodicIncomeInterval) {
      this.periodicIncomeTimer = 0;
      this.gold += this.periodicIncomeAmount;
    }
  }

  reset(): void {
    this.gold = this.startingGold;
    this.periodicIncomeTimer = 0;
  }
}
