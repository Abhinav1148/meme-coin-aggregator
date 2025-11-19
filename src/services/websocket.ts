import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Token, FilterOptions, SortOptions, PaginationOptions } from '../types/token';
import { TokenAggregator } from './aggregator';
import logger from '../utils/logger';

interface ClientPreferences {
  filter?: FilterOptions;
  sort?: SortOptions;
  pagination?: PaginationOptions;
}

export class WebSocketService {
  private io: SocketIOServer;
  private aggregator: TokenAggregator;
  private updateInterval: NodeJS.Timeout | null = null;
  private connectedClients = new Map<string, ClientPreferences>();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });
    this.aggregator = new TokenAggregator();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      this.connectedClients.set(socket.id, {});
      logger.info(`Client connected: ${socket.id} (Total: ${this.connectedClients.size})`);

      socket.on('disconnect', () => {
        this.connectedClients.delete(socket.id);
        logger.info(`Client disconnected: ${socket.id} (Total: ${this.connectedClients.size})`);
      });

      socket.on('subscribe', (preferences?: ClientPreferences) => {
        if (preferences) {
          this.connectedClients.set(socket.id, preferences);
          logger.info(`Client ${socket.id} subscribed with preferences:`, preferences);
        } else {
          logger.info(`Client ${socket.id} subscribed to updates`);
        }
        socket.emit('subscribed', { message: 'Subscribed to real-time updates' });
        // Send initial data with preferences
        this.sendInitialData(socket, preferences);
      });

      socket.on('updatePreferences', (preferences: ClientPreferences) => {
        this.connectedClients.set(socket.id, preferences);
        logger.info(`Client ${socket.id} updated preferences:`, preferences);
        // Send updated data immediately
        this.sendFilteredData(socket, preferences);
      });
    });
  }

  private async sendInitialData(socket: any, preferences?: ClientPreferences): Promise<void> {
    try {
      const tokens = await this.aggregateAndProcessTokens(preferences);
      socket.emit('tokens:update', {
        tokens,
        timestamp: Date.now(),
        type: 'full',
      });
    } catch (error) {
      logger.error('Error sending initial data:', error);
      socket.emit('error', { message: 'Failed to fetch initial data' });
    }
  }

  private async sendFilteredData(socket: any, preferences?: ClientPreferences): Promise<void> {
    try {
      const tokens = await this.aggregateAndProcessTokens(preferences);
      socket.emit('tokens:update', {
        tokens,
        timestamp: Date.now(),
        type: 'full',
      });
    } catch (error) {
      logger.error('Error sending filtered data:', error);
      socket.emit('error', { message: 'Failed to fetch filtered data' });
    }
  }

  private async aggregateAndProcessTokens(preferences?: ClientPreferences): Promise<Token[]> {
    try {
      // Get all tokens
      let tokens = await this.aggregator.aggregateTokens();

      // If no tokens, return empty array
      if (!tokens || tokens.length === 0) {
        logger.warn('No tokens available to process');
        return [];
      }

      // Apply filters if provided
      if (preferences?.filter) {
        tokens = this.aggregator.filterTokens(tokens, preferences.filter);
      }

      // Apply sorting if provided
      if (preferences?.sort) {
        tokens = this.aggregator.sortTokens(tokens, preferences.sort);
      }

      // Apply pagination if provided (default to 25 tokens per page)
      const paginationOptions: PaginationOptions = preferences?.pagination || { limit: 25 };
      const { tokens: paginatedTokens } = this.aggregator.paginateTokens(tokens, paginationOptions);

      return paginatedTokens;
    } catch (error) {
      logger.error('Error aggregating and processing tokens:', error);
      return []; // Return empty array on error instead of crashing
    }
  }

  startPeriodicUpdates(intervalSeconds: number = 5): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      if (this.connectedClients.size === 0) {
        return; // Don't fetch if no clients connected
      }

      try {
        // Send personalized updates to each client based on their preferences
        // Each client gets fresh data filtered/sorted/paginated according to their preferences
        this.connectedClients.forEach((preferences, clientId) => {
          const socket = this.io.sockets.sockets.get(clientId);
          if (socket && socket.connected) {
            this.sendFilteredData(socket, preferences);
          }
        });

        logger.debug(`Sent updates to ${this.connectedClients.size} clients`);
      } catch (error) {
        logger.error('Error in periodic update:', error);
      }
    }, intervalSeconds * 1000);

    logger.info(`Started periodic WebSocket updates every ${intervalSeconds} seconds`);
  }


  broadcastUpdate(tokens: Token[]): void {
    this.io.emit('tokens:update', {
      tokens,
      timestamp: Date.now(),
      type: 'full',
    });
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.io.close();
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}

