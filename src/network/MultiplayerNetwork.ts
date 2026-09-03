import { DifficultyMode, MapType, MultiplayerRoom, NetworkMessage, PlayerRole } from '../types';

export class MultiplayerNetwork {
  private channel: BroadcastChannel | null = null;
  private listeners: Array<(msg: NetworkMessage) => void> = [];
  private currentRoom: MultiplayerRoom | null = null;
  private currentRole: PlayerRole | null = null;
  private announceInterval: number | null = null;
  private channelName: string = 'td_multiplayer_channel';

  constructor() {
    this.initChannel();
  }

  private initChannel(): void {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event: MessageEvent<NetworkMessage>) => {
          this.handleIncomingMessage(event.data);
        };
      }
    } catch (err) {
      console.warn('BroadcastChannel not supported or failed to initialize:', err);
    }
  }

  public subscribe(callback: (msg: NetworkMessage) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  public broadcast(msg: NetworkMessage): void {
    if (this.channel) {
      this.channel.postMessage(msg);
    }
  }

  private handleIncomingMessage(msg: NetworkMessage): void {
    // Internal state management for host answering queries
    if (msg.type === 'QUERY_ROOMS') {
      if (this.currentRoom && this.currentRole === 'p1' && this.currentRoom.status !== 'in_game') {
        this.broadcast({
          type: 'ANNOUNCE_ROOM',
          room: { ...this.currentRoom },
        });
      }
    } else if (msg.type === 'JOIN_ROOM') {
      if (
        this.currentRoom &&
        this.currentRole === 'p1' &&
        this.currentRoom.id === msg.roomId
      ) {
        this.currentRoom.guestTag = msg.guestTag;
        this.currentRoom.status = 'ready';
        this.currentRoom.guestReady = false;
        const acceptedMsg: NetworkMessage = {
          type: 'JOIN_ACCEPTED',
          room: { ...this.currentRoom },
        };
        this.broadcast(acceptedMsg);

        // Notify local listeners so Host game state updates immediately
        for (const listener of this.listeners) {
          try {
            listener(acceptedMsg);
          } catch (err) {
            console.error('Error in network listener:', err);
          }
        }
      }
    } else if (msg.type === 'JOIN_ACCEPTED') {
      if (this.currentRole === 'p2' || !this.currentRole) {
        this.currentRoom = { ...msg.room };
        this.currentRole = 'p2';
      }
    } else if (msg.type === 'TOGGLE_READY') {
      if (this.currentRoom && this.currentRoom.id === msg.roomId) {
        if (msg.role === 'p1') {
          this.currentRoom.hostReady = msg.ready;
        } else {
          this.currentRoom.guestReady = msg.ready;
        }
      }
    } else if (msg.type === 'LEAVE_ROOM') {
      if (this.currentRoom && this.currentRoom.id === msg.roomId) {
        if (msg.role === 'p2' && this.currentRole === 'p1') {
          this.currentRoom.guestTag = undefined;
          this.currentRoom.guestReady = false;
          this.currentRoom.status = 'waiting';
        } else if (msg.role === 'p1' && this.currentRole === 'p2') {
          this.currentRoom = null;
        }
      }
    }

    // Notify all listeners
    for (const listener of this.listeners) {
      try {
        listener(msg);
      } catch (err) {
        console.error('Error in network listener:', err);
      }
    }
  }

  public createRoom(hostTag: string, mapType: MapType, difficulty: DifficultyMode): MultiplayerRoom {
    this.leaveCurrentRoom();

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const room: MultiplayerRoom = {
      id: `ROOM-${randomSuffix}`,
      hostTag,
      mapType,
      difficulty,
      status: 'waiting',
      hostReady: false,
      guestReady: false,
      createdAt: Date.now(),
    };

    this.currentRoom = room;
    this.currentRole = 'p1';

    // Broadcast room existence immediately
    this.broadcast({
      type: 'ANNOUNCE_ROOM',
      room: { ...this.currentRoom },
    });

    // Periodically announce while waiting for guest
    if (this.announceInterval) {
      clearInterval(this.announceInterval);
    }
    this.announceInterval = window.setInterval(() => {
      if (this.currentRoom && this.currentRoom.status === 'waiting') {
        this.broadcast({
          type: 'ANNOUNCE_ROOM',
          room: { ...this.currentRoom },
        });
      }
    }, 1500);

    return room;
  }

  public requestJoinRoom(roomId: string, guestTag: string): void {
    this.currentRole = 'p2';
    this.broadcast({
      type: 'JOIN_ROOM',
      roomId,
      guestTag,
    });
  }

  public queryOpenRooms(): void {
    this.broadcast({
      type: 'QUERY_ROOMS',
    });
  }

  public setRoom(room: MultiplayerRoom | null, role: PlayerRole | null): void {
    this.currentRoom = room;
    this.currentRole = role;
  }

  public getCurrentRoom(): MultiplayerRoom | null {
    return this.currentRoom ? { ...this.currentRoom } : null;
  }

  public getCurrentRole(): PlayerRole | null {
    return this.currentRole;
  }

  public toggleReady(ready: boolean): void {
    if (!this.currentRoom || !this.currentRole) return;

    if (this.currentRole === 'p1') {
      this.currentRoom.hostReady = ready;
    } else {
      this.currentRoom.guestReady = ready;
    }

    this.broadcast({
      type: 'TOGGLE_READY',
      roomId: this.currentRoom.id,
      role: this.currentRole,
      ready,
    });
  }

  public leaveCurrentRoom(): void {
    if (this.announceInterval) {
      clearInterval(this.announceInterval);
      this.announceInterval = null;
    }

    if (this.currentRoom && this.currentRole) {
      this.broadcast({
        type: 'LEAVE_ROOM',
        roomId: this.currentRoom.id,
        role: this.currentRole,
      });
    }

    this.currentRoom = null;
    this.currentRole = null;
  }

  public destroy(): void {
    this.leaveCurrentRoom();
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners = [];
  }
}
