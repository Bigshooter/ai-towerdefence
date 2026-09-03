# Task 29: Real-Time Network Synchronization & Deterministic Simulation

Part of [docs/features/cooperative-multiplayer.md](docs/features/cooperative-multiplayer.md).

## Problem
In a fast-paced real-time tower defense game, both players must see identical enemy positions, health bars, projectile trajectories, wave timers, and tower placements without visual desynchronization or lag spikes.

## Relevant Files
- [src/types.ts](src/types.ts)
- [src/engine/GameLoop.ts](src/engine/GameLoop.ts)
- [src/main.ts](src/main.ts)
- [src/system/WaveSystem.ts](src/system/WaveSystem.ts)
- [src/entities/Enemy.ts](src/entities/Enemy.ts)
- [src/entities/Projectile.ts](src/entities/Projectile.ts)

## Subtasks

### 29.1 Networking Transport & Messaging Layer
- Implement a lightweight network synchronization client using WebRTC DataChannels (with WebSocket fallback/signaling relay):
  ```typescript
  export interface NetworkTransport {
    connect(roomId: string, isHost: boolean): Promise<void>;
    send(message: NetworkMessage): void;
    onMessage(callback: (msg: NetworkMessage) => void): void;
    disconnect(): void;
  }
  ```
- Support serialization and low-latency packet delivery for game actions:
  - `PLACE_TOWER`
  - `UPGRADE_TOWER`
  - `SELL_TOWER`
  - `START_WAVE`
  - `SET_GAME_SPEED`
  - `PING_GRID`

### 29.2 Deterministic Simulation & Seed Synchronization ([src/system/WaveSystem.ts](src/system/WaveSystem.ts) & [src/main.ts](src/main.ts))
- Introduce a deterministic Pseudo-Random Number Generator (PRNG, e.g. Mulberry32 or Xoshiro128):
  - Host generates random seed at match launch and sends `START_GAME { seed, startTime }` to Guest.
  - Enemy spawn intervals, path offset jitter, and randomized enemy sub-attributes use the seeded PRNG.
  - Target selection algorithms (first, lowest health, highest health, closest) execute deterministically on both clients.

### 29.3 Action Dispatching & Remote Event Handling ([src/main.ts](src/main.ts))
- When local player places/upgrades/sells a tower:
  - Broadcast action packet to peer.
  - Apply action immediately with local client prediction.
- When receiving action packet from remote peer:
  - Execute placement/upgrade/sale on the local game instance using the remote player's credentials and parameters.
- Synchronize game speed changes (`1X`, `2X`, `3X`, `5X`) across both clients.

### 29.4 Checksum & Periodic Sync Validation ([src/main.ts](src/main.ts))
- Every 60 frames (1 second), Host broadcasts a lightweight state hash:
  $$\text{Hash} = f(\text{waveNumber}, \text{baseHealth}, \text{p1Gold}, \text{p2Gold}, \text{enemyCount}, \text{towerCount})$$
- Guest verifies local hash against Host hash. In case of drift, Guest reconciles gold and base health to ensure smooth continuous play.

## Acceptance Criteria
- Tower placement, upgrades, and sales triggered on one client appear instantly on the connected partner's screen.
- Enemies spawn at identical timestamps and follow identical paths with matching health on both machines.
- Speed changes and wave triggers propagate synchronously.
- State hashes confirm simulation determinism across multiple waves.
