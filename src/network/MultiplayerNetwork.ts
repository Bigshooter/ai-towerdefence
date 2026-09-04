import { DifficultyMode, MapType, MultiplayerRoom, NetworkMessage, PlayerRole } from '../types';
import Peer, { DataConnection } from 'peerjs';

interface NetworkEnvelope {
  id: string;
  message: NetworkMessage;
}

type LobbyMessage =
  | { type: 'REGISTER_ROOM'; room: MultiplayerRoom }
  | { type: 'UNREGISTER_ROOM'; roomId: string }
  | { type: 'QUERY_ROOMS' }
  | { type: 'ROOM_LIST'; rooms: MultiplayerRoom[] };

interface LobbyRoomRecord {
  room: MultiplayerRoom;
  lastSeen: number;
}

export class MultiplayerNetwork {
  private channel: BroadcastChannel | null = null;
  private peer: Peer | null = null;
  private peerConnections: Set<DataConnection> = new Set();
  private lobbyPeer: Peer | null = null;
  private lobbyConnection: DataConnection | null = null;
  private lobbyClients: Set<DataConnection> = new Set();
  private lobbyRooms: Map<string, LobbyRoomRecord> = new Map();
  private isLobbyCoordinator = false;
  private lobbyRetryTimer: number | null = null;
  private lobbyHeartbeatInterval: number | null = null;
  private lastLobbyResponse = 0;
  private listeners: Array<(msg: NetworkMessage) => void> = [];
  private currentRoom: MultiplayerRoom | null = null;
  private currentRole: PlayerRole | null = null;
  private announceInterval: number | null = null;
  private channelName: string = 'td_multiplayer_channel';
  private readonly clientId = crypto.randomUUID();
  private readonly peerNamespace = location.host.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  private readonly lobbyPeerId = `ai-towerdefence-public-lobby-v1-${this.peerNamespace}`;
  private messageSequence = 0;
  private seenMessages: Set<string> = new Set();

  constructor() {
    this.initChannel();
  }

  private initChannel(): void {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event: MessageEvent<NetworkEnvelope | NetworkMessage>) => {
          this.handleIncomingData(event.data);
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
    const envelope = this.createEnvelope(msg);
    this.sendEnvelope(envelope);
  }

  private sendEnvelope(envelope: NetworkEnvelope): void {
    this.channel?.postMessage(envelope);

    for (const connection of this.peerConnections) {
      if (connection.open) {
        connection.send(envelope);
      }
    }
  }

  private createEnvelope(message: NetworkMessage): NetworkEnvelope {
    this.messageSequence++;
    return {
      id: `${this.clientId}:${this.messageSequence}`,
      message,
    };
  }

  private handleIncomingData(data: NetworkEnvelope | NetworkMessage): void {
    if ('id' in data && 'message' in data) {
      if (this.seenMessages.has(data.id)) return;

      this.seenMessages.add(data.id);
      if (this.seenMessages.size > 1000) {
        const oldestId = this.seenMessages.values().next().value;
        if (oldestId) this.seenMessages.delete(oldestId);
      }
      this.handleIncomingMessage(data.message);
      return;
    }

    this.handleIncomingMessage(data);
  }

  private initializeHostPeer(roomId: string): void {
    this.disconnectPeer();
    this.peer = new Peer(this.peerIdForRoom(roomId));
    this.peer.on('connection', (connection) => this.registerPeerConnection(connection));
    this.peer.on('error', (error) => {
      console.error('Multiplayer host connection failed:', error);
    });
  }

  private initializeGuestPeer(roomId: string, joinEnvelope: NetworkEnvelope): void {
    this.disconnectPeer();
    this.peer = new Peer();
    this.peer.on('open', () => {
      if (!this.peer) return;

      const connection = this.peer.connect(this.peerIdForRoom(roomId), {
        reliable: true,
        serialization: 'json',
      });
      this.registerPeerConnection(connection, joinEnvelope);
    });
    this.peer.on('error', (error) => {
      console.error('Multiplayer guest connection failed:', error);
    });
  }

  private registerPeerConnection(connection: DataConnection, envelopeOnOpen?: NetworkEnvelope): void {
    this.peerConnections.add(connection);
    connection.on('data', (data) => {
      this.handleIncomingData(data as NetworkEnvelope | NetworkMessage);
    });
    connection.on('open', () => {
      if (envelopeOnOpen) {
        connection.send(envelopeOnOpen);
      }
    });
    connection.on('close', () => {
      this.peerConnections.delete(connection);
    });
    connection.on('error', (error) => {
      console.error('Multiplayer data connection failed:', error);
      this.peerConnections.delete(connection);
    });
  }

  private peerIdForRoom(roomId: string): string {
    return `ai-towerdefence-${this.peerNamespace}-${roomId.toLowerCase()}`;
  }

  private disconnectPeer(): void {
    for (const connection of this.peerConnections) {
      connection.close();
    }
    this.peerConnections.clear();
    this.peer?.destroy();
    this.peer = null;
  }

  private initializeLobby(): void {
    this.disconnectLobby();
    const candidate = new Peer(this.lobbyPeerId);
    this.lobbyPeer = candidate;

    candidate.on('open', () => {
      this.isLobbyCoordinator = true;
      candidate.on('connection', (connection) => this.registerLobbyClient(connection));
      this.registerCurrentRoomWithLobby();
    });
    candidate.on('error', (error) => {
      if (error.type === 'unavailable-id') {
        candidate.destroy();
        if (this.lobbyPeer === candidate) {
          this.connectToLobbyCoordinator();
        }
        return;
      }
      if (this.lobbyPeer === candidate) {
        console.error('Multiplayer lobby connection failed:', error);
        this.scheduleLobbyReconnect();
      }
    });
  }

  private ensureLobbyInitialized(): void {
    if (!this.lobbyPeer && this.lobbyRetryTimer === null) {
      this.initializeLobby();
    }
  }

  private connectToLobbyCoordinator(): void {
    const peer = new Peer();
    this.lobbyPeer = peer;
    this.isLobbyCoordinator = false;

    peer.on('open', () => {
      const connection = peer.connect(this.lobbyPeerId, {
        reliable: true,
        serialization: 'json',
      });
      this.lobbyConnection = connection;
      connection.on('data', (data) => this.handleLobbyMessage(data as LobbyMessage));
      connection.on('open', () => {
        this.lastLobbyResponse = Date.now();
        this.startLobbyHeartbeat();
        this.registerCurrentRoomWithLobby();
        this.sendLobbyMessage({ type: 'QUERY_ROOMS' });
      });
      connection.on('close', () => {
        if (this.lobbyConnection === connection) {
          this.lobbyConnection = null;
          this.scheduleLobbyReconnect();
        }
      });
      connection.on('error', () => {
        if (this.lobbyConnection === connection) {
          this.scheduleLobbyReconnect();
        }
      });
    });
    peer.on('error', (error) => {
      if (this.lobbyPeer === peer) {
        if (error.type !== 'peer-unavailable') {
          console.error('Multiplayer lobby client failed:', error);
        }
        this.scheduleLobbyReconnect();
      }
    });
  }

  private registerLobbyClient(connection: DataConnection): void {
    this.lobbyClients.add(connection);
    connection.on('data', (data) => this.handleLobbyMessage(data as LobbyMessage, connection));
    connection.on('close', () => this.lobbyClients.delete(connection));
    connection.on('error', () => this.lobbyClients.delete(connection));
  }

  private handleLobbyMessage(message: LobbyMessage, source?: DataConnection): void {
    if (message.type === 'REGISTER_ROOM' && this.isLobbyCoordinator) {
      if (message.room.status === 'waiting') {
        this.lobbyRooms.set(message.room.id, { room: { ...message.room }, lastSeen: Date.now() });
      } else {
        this.lobbyRooms.delete(message.room.id);
      }
      this.publishLobbyRoomList();
    } else if (message.type === 'UNREGISTER_ROOM' && this.isLobbyCoordinator) {
      this.lobbyRooms.delete(message.roomId);
      this.publishLobbyRoomList();
    } else if (message.type === 'QUERY_ROOMS' && this.isLobbyCoordinator) {
      const rooms = this.getFreshLobbyRooms();
      if (source?.open) {
        source.send({ type: 'ROOM_LIST', rooms } satisfies LobbyMessage);
      } else {
        this.applyLobbyRoomList(rooms);
      }
    } else if (message.type === 'ROOM_LIST') {
      this.lastLobbyResponse = Date.now();
      this.applyLobbyRoomList(message.rooms);
    }
  }

  private getFreshLobbyRooms(): MultiplayerRoom[] {
    const cutoff = Date.now() - 5000;
    for (const [roomId, record] of this.lobbyRooms) {
      if (record.lastSeen < cutoff || record.room.status !== 'waiting') {
        this.lobbyRooms.delete(roomId);
      }
    }
    return Array.from(this.lobbyRooms.values(), ({ room }) => ({ ...room }));
  }

  private applyLobbyRoomList(rooms: MultiplayerRoom[]): void {
    for (const room of rooms) {
      this.handleIncomingMessage({ type: 'ANNOUNCE_ROOM', room });
    }
  }

  private publishLobbyRoomList(): void {
    const message: LobbyMessage = { type: 'ROOM_LIST', rooms: this.getFreshLobbyRooms() };
    this.handleLobbyMessage(message);
    for (const connection of this.lobbyClients) {
      if (connection.open) {
        connection.send(message);
      }
    }
  }

  private sendLobbyMessage(message: LobbyMessage): void {
    if (this.isLobbyCoordinator) {
      this.handleLobbyMessage(message);
    } else if (this.lobbyConnection?.open) {
      this.lobbyConnection.send(message);
    }
  }

  private registerCurrentRoomWithLobby(): void {
    if (this.currentRoom?.status === 'waiting' && this.currentRole === 'p1') {
      this.sendLobbyMessage({ type: 'REGISTER_ROOM', room: { ...this.currentRoom } });
    }
  }

  private scheduleLobbyReconnect(): void {
    if (this.lobbyRetryTimer !== null) return;
    this.lobbyRetryTimer = window.setTimeout(() => {
      this.lobbyRetryTimer = null;
      this.initializeLobby();
    }, 1000 + Math.random() * 1000);
  }

  private startLobbyHeartbeat(): void {
    if (this.lobbyHeartbeatInterval !== null) {
      clearInterval(this.lobbyHeartbeatInterval);
    }
    this.lobbyHeartbeatInterval = window.setInterval(() => {
      if (!this.lobbyConnection?.open || Date.now() - this.lastLobbyResponse > 5000) {
        this.initializeLobby();
        return;
      }
      this.sendLobbyMessage({ type: 'QUERY_ROOMS' });
    }, 2000);
  }

  private disconnectLobby(): void {
    if (this.lobbyHeartbeatInterval !== null) {
      clearInterval(this.lobbyHeartbeatInterval);
      this.lobbyHeartbeatInterval = null;
    }
    const lobbyConnection = this.lobbyConnection;
    this.lobbyConnection = null;
    lobbyConnection?.close();
    for (const connection of this.lobbyClients) {
      connection.close();
    }
    this.lobbyClients.clear();
    this.lobbyPeer?.destroy();
    this.lobbyPeer = null;
    this.isLobbyCoordinator = false;
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
        this.sendLobbyMessage({ type: 'UNREGISTER_ROOM', roomId: this.currentRoom.id });
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
    this.ensureLobbyInitialized();

    const randomSuffix = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map((value) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[value % 36])
      .join('');
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
    this.initializeHostPeer(room.id);
    this.registerCurrentRoomWithLobby();

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
        this.registerCurrentRoomWithLobby();
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
    const joinEnvelope = this.createEnvelope({
      type: 'JOIN_ROOM',
      roomId,
      guestTag,
    });
    this.sendEnvelope(joinEnvelope);
    this.initializeGuestPeer(roomId, joinEnvelope);
  }

  public queryOpenRooms(): void {
    this.ensureLobbyInitialized();
    this.broadcast({
      type: 'QUERY_ROOMS',
    });
    this.sendLobbyMessage({ type: 'QUERY_ROOMS' });
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
      if (this.currentRole === 'p1') {
        this.sendLobbyMessage({ type: 'UNREGISTER_ROOM', roomId: this.currentRoom.id });
      }
      this.broadcast({
        type: 'LEAVE_ROOM',
        roomId: this.currentRoom.id,
        role: this.currentRole,
      });
    }

    this.currentRoom = null;
    this.currentRole = null;
    this.disconnectPeer();
  }

  public destroy(): void {
    this.leaveCurrentRoom();
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (this.lobbyRetryTimer !== null) {
      clearTimeout(this.lobbyRetryTimer);
      this.lobbyRetryTimer = null;
    }
    this.disconnectLobby();
    this.listeners = [];
  }
}
