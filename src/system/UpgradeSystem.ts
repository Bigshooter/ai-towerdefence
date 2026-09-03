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
    if (tower.data.level >= 5) return options;

    const baseCost = tower.getUpgradeCost();

    // Archetype special upgrades at key levels
    if (tower.data.level === 2) {
      if (tower.data.type === 'cannon') {
        options.push({
          type: 'special',
          name: 'Incendiary Rounds',
          description: '+30% splash radius & +20% damage',
          cost: Math.floor(baseCost * 1.2),
          apply: (t) => {
            t.data.damage *= 1.2;
            t.data.range *= 1.1;
            if (t.data.splashRadius) t.data.splashRadius *= 1.3;
          },
        });
      } else if (tower.data.type === 'ice') {
        options.push({
          type: 'special',
          name: 'Deep Freeze',
          description: '+50% slow duration & +20% damage',
          cost: Math.floor(baseCost * 1.1),
          apply: (t) => {
            t.data.damage *= 1.2;
            t.data.range *= 1.1;
            if (t.data.slowDuration) t.data.slowDuration *= 1.5;
          },
        });
      }
    } else if (tower.data.level === 3) {
      if (tower.data.type === 'sniper') {
        options.push({
          type: 'special',
          name: 'Piercing Rounds',
          description: '+25% armor pierce & +20% damage',
          cost: Math.floor(baseCost * 1.3),
          apply: (t) => {
            t.data.damage *= 1.25;
            t.data.range *= 1.1;
            t.data.fireRate *= 1.1;
          },
        });
      } else if (tower.data.type === 'archer') {
        options.push({
          type: 'special',
          name: 'Poison Tips',
          description: '+25% damage & +15% fire rate',
          cost: Math.floor(baseCost * 1.2),
          apply: (t) => {
            t.data.damage *= 1.25;
            t.data.range *= 1.1;
            t.data.fireRate *= 1.15;
          },
        });
      }
    }

    // Default progression upgrade option
    options.push({
      type: 'damage',
      name: 'Power Upgrade',
      description: '+20% damage, +10% range',
      cost: Math.floor(baseCost * 0.8),
      apply: (t) => {
        t.data.damage *= 1.2;
        t.data.range *= 1.1;
        t.data.fireRate *= 1.05;
      },
    });

    return options;
  }

  sellTower(tower: Tower): number {
    const sellValue = Math.floor(tower.data.cost * 0.6 * tower.data.level);
    return sellValue;
  }
}
