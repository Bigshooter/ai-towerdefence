import { Tower } from '../entities/Tower';

export interface UpgradeOption {
  type: 'damage' | 'range' | 'fireRate' | 'special';
  name: string;
  description: string;
  cost: number;
  apply: (tower: Tower) => void;
}

export class UpgradeSystem {
  getUpgradeOptions(tower: Tower): UpgradeOption[] {
    const options: UpgradeOption[] = [];
    const baseCost = tower.getUpgradeCost();

    // Damage upgrade
    if (tower.data.level < 5) {
      options.push({
        type: 'damage',
        name: 'Power Shot',
        description: `+20% damage`,
        cost: Math.floor(baseCost * 0.8),
        apply: (t) => { t.data.damage *= 1.2; },
      });
    }

    // Range upgrade
    if (tower.data.level < 5) {
      options.push({
        type: 'range',
        name: 'Extended Range',
        description: `+10% range`,
        cost: Math.floor(baseCost * 0.8),
        apply: (t) => { t.data.range *= 1.1; },
      });
    }

    // Fire rate upgrade
    if (tower.data.level < 5) {
      options.push({
        type: 'fireRate',
        name: 'Rapid Fire',
        description: `+10% fire rate`,
        cost: Math.floor(baseCost * 1.0),
        apply: (t) => { t.data.fireRate *= 1.1; },
      });
    }

    // Special upgrades per tower type
    if (tower.data.type === 'cannon' && tower.data.level >= 2) {
      options.push({
        type: 'special',
        name: 'Incendiary Rounds',
        description: '+30% splash radius',
        cost: Math.floor(baseCost * 1.5),
        apply: (t) => { if (t.data.splashRadius) t.data.splashRadius *= 1.3; },
      });
    }

    if (tower.data.type === 'ice' && tower.data.level >= 2) {
      options.push({
        type: 'special',
        name: 'Deep Freeze',
        description: '+50% slow duration',
        cost: Math.floor(baseCost * 1.2),
        apply: (t) => { if (t.data.slowDuration) t.data.slowDuration *= 1.5; },
      });
    }

    if (tower.data.type === 'sniper' && tower.data.level >= 3) {
      options.push({
        type: 'special',
        name: 'Piercing Rounds',
        description: '+25% damage vs armored',
        cost: Math.floor(baseCost * 1.8),
        apply: (t) => { t.data.damage *= 1.25; },
      });
    }

    if (tower.data.type === 'archer' && tower.data.level >= 3) {
      options.push({
        type: 'special',
        name: 'Poison Tips',
        description: 'Attacks poison for DoT',
        cost: Math.floor(baseCost * 1.5),
        apply: (t) => { t.data.damage *= 1.15; }, // Simplified - would need DOT system
      });
    }

    return options;
  }

  sellTower(tower: Tower): number {
    const sellValue = Math.floor(tower.data.cost * 0.6 * tower.data.level);
    return sellValue;
  }
}
