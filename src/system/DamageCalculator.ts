import { PlayerCombatStats, PlayerRole, TowerType } from '../types';

export class DamageCalculator {
  private p1Stats: PlayerCombatStats;
  private p2Stats: PlayerCombatStats;
  private isMultiplayer: boolean = false;

  constructor() {
    this.p1Stats = this.createEmptyStats();
    this.p2Stats = this.createEmptyStats();
  }

  private createEmptyStats(): PlayerCombatStats {
    return {
      totalDamage: 0,
      waveDamage: 0,
      kills: 0,
      damageByTowerType: {
        archer: 0,
        cannon: 0,
        sniper: 0,
        ice: 0,
        flamethrower: 0,
      },
    };
  }

  public setMultiplayer(enabled: boolean): void {
    this.isMultiplayer = enabled;
  }

  public recordDamage(role: PlayerRole | undefined, amount: number, towerType?: TowerType): void {
    if (amount <= 0) return;
    const targetRole = role ?? 'p1';
    const stats = targetRole === 'p1' ? this.p1Stats : this.p2Stats;

    stats.totalDamage += amount;
    stats.waveDamage += amount;
    if (towerType) {
      stats.damageByTowerType[towerType] = (stats.damageByTowerType[towerType] || 0) + amount;
    }
  }

  public recordKill(role: PlayerRole | undefined): void {
    const targetRole = role ?? 'p1';
    const stats = targetRole === 'p1' ? this.p1Stats : this.p2Stats;
    stats.kills += 1;
  }

  public getTotalDamage(role: PlayerRole = 'p1'): number {
    return role === 'p1' ? this.p1Stats.totalDamage : this.p2Stats.totalDamage;
  }

  public getWaveDamage(role: PlayerRole = 'p1'): number {
    return role === 'p1' ? this.p1Stats.waveDamage : this.p2Stats.waveDamage;
  }

  public getKills(role: PlayerRole = 'p1'): number {
    return role === 'p1' ? this.p1Stats.kills : this.p2Stats.kills;
  }

  public getStats(role: PlayerRole = 'p1'): PlayerCombatStats {
    return role === 'p1' ? { ...this.p1Stats } : { ...this.p2Stats };
  }

  public setStats(p1: PlayerCombatStats, p2: PlayerCombatStats): void {
    this.p1Stats = {
      ...p1,
      damageByTowerType: { ...p1.damageByTowerType },
    };
    this.p2Stats = {
      ...p2,
      damageByTowerType: { ...p2.damageByTowerType },
    };
  }

  public getContributionSplit(): { p1Percent: number; p2Percent: number; p1Total: number; p2Total: number } {
    const p1 = Math.round(this.p1Stats.totalDamage);
    const p2 = Math.round(this.p2Stats.totalDamage);
    const total = p1 + p2;

    if (total === 0) {
      return { p1Percent: 50, p2Percent: 50, p1Total: 0, p2Total: 0 };
    }

    const p1Percent = Math.round((p1 / total) * 100);
    const p2Percent = 100 - p1Percent;

    return {
      p1Percent,
      p2Percent,
      p1Total: p1,
      p2Total: p2,
    };
  }

  public getWaveLeader(p1Tag: string, p2Tag: string): { tag: string; role: PlayerRole; waveDamage: number } | null {
    const p1Dmg = Math.round(this.p1Stats.waveDamage);
    const p2Dmg = Math.round(this.p2Stats.waveDamage);
    if (p1Dmg === 0 && p2Dmg === 0) return null;

    if (p1Dmg >= p2Dmg) {
      return { tag: p1Tag, role: 'p1', waveDamage: p1Dmg };
    } else {
      return { tag: p2Tag, role: 'p2', waveDamage: p2Dmg };
    }
  }

  public resetWaveDamage(): void {
    this.p1Stats.waveDamage = 0;
    this.p2Stats.waveDamage = 0;
  }

  public reset(): void {
    this.p1Stats = this.createEmptyStats();
    this.p2Stats = this.createEmptyStats();
  }
}
