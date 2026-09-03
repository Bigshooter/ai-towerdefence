import { DifficultyMode, HighScoreEntry, Leaderboards, MapType } from '../types';

export class HighScoreSystem {
  public static readonly STORAGE_KEY = 'td_highscores';
  public static readonly MAX_ENTRIES_PER_MAP = 10;
  public static readonly MAX_NAME_LENGTH = 6;

  private leaderboards: Leaderboards;

  constructor() {
    this.leaderboards = this.loadScores();
  }

  /**
   * Sanitizes a player name:
   * - Strips non-alphanumeric characters
   * - Converts to uppercase
   * - Clamps to 1-6 characters
   * - Defaults to 'PLAYER' if empty
   */
  public sanitizeName(name: string): string {
    const cleaned = (name || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, HighScoreSystem.MAX_NAME_LENGTH);
    return cleaned.length > 0 ? cleaned : 'PLAYER';
  }

  /**
   * Check if a score qualifies for the top 10 on a given map
   */
  public isHighScore(mapType: MapType, score: number): boolean {
    if (score <= 0) return false;
    const entries = this.getScores(mapType);
    if (entries.length < HighScoreSystem.MAX_ENTRIES_PER_MAP) {
      return true;
    }
    const lowestTopScore = entries[entries.length - 1].score;
    return score > lowestTopScore;
  }

  /**
   * Adds a new high score entry, sorts descending, trims to top 10, and persists
   */
  public addScore(
    mapType: MapType,
    name: string,
    score: number,
    wave: number,
    difficulty: DifficultyMode
  ): HighScoreEntry {
    const sanitizedName = this.sanitizeName(name);
    const entry: HighScoreEntry = {
      id: `score_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: sanitizedName,
      score,
      wave,
      difficulty,
      mapType,
      timestamp: Date.now(),
    };

    if (!this.leaderboards[mapType]) {
      this.leaderboards[mapType] = [];
    }

    this.leaderboards[mapType].push(entry);
    this.sortAndTrim(mapType);
    this.saveScores();

    return entry;
  }

  /**
   * Gets a copy of the high scores for a given map
   */
  public getScores(mapType: MapType): HighScoreEntry[] {
    const entries = this.leaderboards[mapType] || [];
    return [...entries];
  }

  /**
   * Clears scores for a specific map or all maps
   */
  public clearScores(mapType?: MapType): void {
    if (mapType) {
      this.leaderboards[mapType] = [];
    } else {
      this.leaderboards = {
        space: [],
        dungeon: [],
        military: [],
      };
    }
    this.saveScores();
  }

  private sortAndTrim(mapType: MapType): void {
    const entries = this.leaderboards[mapType] || [];
    entries.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.wave !== a.wave) {
        return b.wave - a.wave;
      }
      return a.timestamp - b.timestamp;
    });

    this.leaderboards[mapType] = entries.slice(0, HighScoreSystem.MAX_ENTRIES_PER_MAP);
  }

  private loadScores(): Leaderboards {
    const defaultData: Leaderboards = {
      space: [],
      dungeon: [],
      military: [],
    };

    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return defaultData;
      }

      const raw = window.localStorage.getItem(HighScoreSystem.STORAGE_KEY);
      if (!raw) {
        return defaultData;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return defaultData;
      }

      const validated: Leaderboards = {
        space: this.validateEntries(parsed.space, 'space'),
        dungeon: this.validateEntries(parsed.dungeon, 'dungeon'),
        military: this.validateEntries(parsed.military, 'military'),
      };

      return validated;
    } catch {
      return defaultData;
    }
  }

  private validateEntries(list: any, mapType: MapType): HighScoreEntry[] {
    if (!Array.isArray(list)) return [];
    return list
      .filter((item) => item && typeof item === 'object' && typeof item.score === 'number')
      .map((item) => ({
        id: typeof item.id === 'string' ? item.id : `score_${Math.random().toString(36).substring(2, 7)}`,
        name: this.sanitizeName(item.name),
        score: Number(item.score) || 0,
        wave: Number(item.wave) || 1,
        difficulty: (['easy', 'medium', 'hard'].includes(item.difficulty) ? item.difficulty : 'easy') as DifficultyMode,
        mapType,
        timestamp: Number(item.timestamp) || Date.now(),
      }))
      .slice(0, HighScoreSystem.MAX_ENTRIES_PER_MAP);
  }

  private saveScores(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(HighScoreSystem.STORAGE_KEY, JSON.stringify(this.leaderboards));
    } catch {
      // Ignore quota or disabled localStorage errors
    }
  }
}
