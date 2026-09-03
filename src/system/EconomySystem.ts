import { PlayerRole } from '../types';

export class EconomySystem {
  private gold: number;
  private p1Gold: number = 150;
  private p2Gold: number = 150;
  private isMultiplayer: boolean = false;
  private startingGold: number = 150;
  private periodicIncomeTimer: number = 0;
  private periodicIncomeInterval: number = 10; // seconds
  private periodicIncomeAmount: number = 10;
  private oddRewardFlip: boolean = false;

  constructor(startingGold?: number) {
    this.startingGold = startingGold ?? 150;
    this.gold = this.startingGold;
    this.p1Gold = this.startingGold;
    this.p2Gold = this.startingGold;
  }

  public setMultiplayer(enabled: boolean, startingGold?: number): void {
    this.isMultiplayer = enabled;
    if (startingGold !== undefined) {
      this.startingGold = startingGold;
    }
    this.p1Gold = this.startingGold;
    this.p2Gold = this.startingGold;
    this.gold = this.startingGold;
    this.oddRewardFlip = false;
  }

  public getIsMultiplayer(): boolean {
    return this.isMultiplayer;
  }

  getGold(role?: PlayerRole): number {
    if (!this.isMultiplayer || !role) {
      return this.gold;
    }
    return role === 'p1' ? this.p1Gold : this.p2Gold;
  }

  getP1Gold(): number {
    return this.p1Gold;
  }

  getP2Gold(): number {
    return this.p2Gold;
  }

  setGold(amount: number, role?: PlayerRole): void {
    if (!this.isMultiplayer || !role) {
      this.gold = amount;
      this.p1Gold = amount;
      this.p2Gold = amount;
      return;
    }
    if (role === 'p1') {
      this.p1Gold = amount;
    } else {
      this.p2Gold = amount;
    }
    this.gold = this.p1Gold;
  }

  addGold(amount: number, role?: PlayerRole): void {
    if (!this.isMultiplayer || !role) {
      this.gold += amount;
      return;
    }
    if (role === 'p1') {
      this.p1Gold += amount;
    } else {
      this.p2Gold += amount;
    }
  }

  /**
   * Splits an enemy kill or wave reward 50/50 between P1 and P2 in multiplayer,
   * alternating the 1-gold remainder on odd amounts for perfect fairness.
   */
  awardSplitReward(totalReward: number): { p1Amount: number; p2Amount: number } {
    if (!this.isMultiplayer) {
      this.gold += totalReward;
      return { p1Amount: totalReward, p2Amount: 0 };
    }

    let p1Amount = Math.floor(totalReward / 2);
    let p2Amount = Math.floor(totalReward / 2);
    const remainder = totalReward % 2;

    if (remainder !== 0) {
      if (this.oddRewardFlip) {
        p2Amount += 1;
      } else {
        p1Amount += 1;
      }
      this.oddRewardFlip = !this.oddRewardFlip;
    }

    this.p1Gold += p1Amount;
    this.p2Gold += p2Amount;
    this.gold = this.p1Gold; // Keep fallback synced

    return { p1Amount, p2Amount };
  }

  spendGold(amount: number, role?: PlayerRole): boolean {
    if (!this.isMultiplayer || !role) {
      if (this.gold >= amount) {
        this.gold -= amount;
        return true;
      }
      return false;
    }

    if (role === 'p1') {
      if (this.p1Gold >= amount) {
        this.p1Gold -= amount;
        this.gold = this.p1Gold;
        return true;
      }
      return false;
    } else {
      if (this.p2Gold >= amount) {
        this.p2Gold -= amount;
        return true;
      }
      return false;
    }
  }

  update(dt: number): { p1Income: number; p2Income: number; totalIncome: number } {
    this.periodicIncomeTimer += dt;
    if (this.periodicIncomeTimer >= this.periodicIncomeInterval) {
      this.periodicIncomeTimer = 0;
      if (this.isMultiplayer) {
        const half = Math.floor(this.periodicIncomeAmount / 2);
        this.p1Gold += half;
        this.p2Gold += half;
        this.gold = this.p1Gold;
        return { p1Income: half, p2Income: half, totalIncome: this.periodicIncomeAmount };
      } else {
        this.gold += this.periodicIncomeAmount;
        return { p1Income: this.periodicIncomeAmount, p2Income: 0, totalIncome: this.periodicIncomeAmount };
      }
    }
    return { p1Income: 0, p2Income: 0, totalIncome: 0 };
  }

  reset(): void {
    this.gold = this.startingGold;
    this.p1Gold = this.startingGold;
    this.p2Gold = this.startingGold;
    this.periodicIncomeTimer = 0;
    this.oddRewardFlip = false;
  }
}
