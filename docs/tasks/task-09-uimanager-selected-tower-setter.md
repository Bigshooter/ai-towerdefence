# Task 09: Add a proper setter for UIManager selected tower

## Problem
`Game` bypasses encapsulation with bracket access: `this.uiManager['selectedTowerId'] = selectedTower.id` (in `selectTower`) and `= null` (in `sellSelectedTower`). This defeats TypeScript's private visibility and breaks if the field is renamed.

## Files
- `src/ui/UIManager.ts`
- `src/main.ts` (`selectTower`, `sellSelectedTower`)

## Fix
1. Add `setSelectedTower(id: string | null): void` to `UIManager` (alongside the existing `getSelectedTowerId()`).
2. Replace both bracket-access writes in `main.ts` with the new method.
3. Search for any other `uiManager['...']` accesses and fix them the same way.

## Acceptance criteria
- No bracket-notation private access remains.
- Selecting, deselecting, and selling towers behaves identically.
