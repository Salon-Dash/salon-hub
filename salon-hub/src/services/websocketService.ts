import { WS_BASE_URL } from '@/config/api';
import { Appointment } from './appointmentService';
import { Sale } from './saleService';

type MessageHandler<T> = (data: T) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private stompClient: any = null;
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isManualDisconnect = false; // Flag to prevent reconnection on manual disconnect
  private connectionListeners: Array<() => void> = [];
  private disconnectListeners: Array<() => void> = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;

  async connect(): Promise<void> {
    console.log('🔌 [websocketService] connect() called');
    console.log(`  - Already connected: ${this.connected}`);
    console.log(`  - Is connecting: ${this.isConnecting}`);
    
    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting) {
      console.log('⏳ [websocketService] Already connecting, waiting...');
      return new Promise((resolve) => {
        const checkConnection = () => {
          if (this.connected) {
            resolve();
          } else if (!this.isConnecting) {
            this.connect().then(resolve).catch(() => {});
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    if (this.connected && this.stompClient) {
      return Promise.resolve();
    }

    this.isConnecting = true;
    return new Promise((resolve, reject) => {
      try {
        // Clean up existing connection if any (without triggering reconnection)
        if (this.stompClient || this.socket) {
          this.cleanupConnection(false);
        }

        // Using SockJS for WebSocket connection
        const SockJS = (window as any).SockJS;
        const Stomp = (window as any).Stomp;

        if (!SockJS || !Stomp) {
          console.warn('SockJS or Stomp not available. WebSocket features disabled.');
          this.isConnecting = false;
          reject(new Error('WebSocket libraries not loaded'));
          return;
        }

        // Use WebSocket URL from config
        // SockJS requires HTTP/HTTPS URLs, not ws:// URLs - it handles WebSocket upgrade internally
        // In production, use full URL; in development, use relative path for Vite proxy
        const wsUrl = WS_BASE_URL || '';
        let socketUrl: string;
        
        if (wsUrl) {
          // Convert ws:// to http:// or wss:// to https://
          if (wsUrl.startsWith('ws://')) {
            socketUrl = wsUrl.replace('ws://', 'http://');
          } else if (wsUrl.startsWith('wss://')) {
            socketUrl = wsUrl.replace('wss://', 'https://');
          } else {
            socketUrl = wsUrl;
          }
          // SockJS endpoint is always /ws
          socketUrl = `${socketUrl}/ws`;
        } else {
          // Development: use relative path (Vite proxy handles it)
          socketUrl = '/ws';
        }
        
        console.log('🔌 Connecting to WebSocket via SockJS:', socketUrl);
        
        const socket = new SockJS(socketUrl);
        this.stompClient = Stomp.over(socket);
        this.stompClient.debug = () => {}; // Disable debug logging

        // Set connection timeout
        const connectionTimeout = setTimeout(() => {
          if (!this.connected) {
            console.error('WebSocket connection timeout');
            this.isConnecting = false;
            this.cleanupConnection(false);
            this.handleReconnect();
            reject(new Error('Connection timeout'));
          }
        }, 10000); // 10 second timeout

        // Monitor socket close events - only set after socket is created
        // SockJS handles onclose internally, but we can monitor through STOMP
        // The socket's onclose will be handled by SockJS/STOMP client automatically

        this.stompClient.connect(
          {},
          () => {
            clearTimeout(connectionTimeout);
            this.connected = true;
            this.isConnecting = false;
            this.isManualDisconnect = false;
            this.reconnectAttempts = 0;
            console.log(`✅ WebSocket connected to ${socketUrl}`);
            console.log(`📡 STOMP client ready for subscriptions`);
            
            // Start heartbeat monitoring
            this.startHeartbeatMonitoring();
            
            // Notify listeners
            this.connectionListeners.forEach(listener => listener());
            
            resolve();
          },
          (error: any) => {
            clearTimeout(connectionTimeout);
            this.connected = false;
            this.isConnecting = false;
            console.error(`❌ WebSocket connection error to ${socketUrl}:`, error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            
            // Only reconnect if not manually disconnected
            if (!this.isManualDisconnect) {
              this.cleanupConnection(false);
              this.handleReconnect();
            }
            reject(error);
          }
        );

        // Store socket reference for cleanup
        this.socket = socket as any;
        
        // Monitor socket close through SockJS events (if available)
        // Note: SockJS handles connection lifecycle, STOMP handles protocol
        // We rely on STOMP's error callback and connection state
      } catch (error) {
        this.isConnecting = false;
        console.error('Failed to initialize WebSocket:', error);
        reject(error);
      }
    });
  }

  private startHeartbeatMonitoring(): void {
    this.stopHeartbeatMonitoring();
    // Note: STOMP heartbeats are handled at protocol level (10s interval from server)
    // We don't need to monitor heartbeats manually - STOMP client handles connection state
    // This is kept for potential future use but currently disabled to avoid false timeouts
    // The socket.onclose event will handle actual disconnections
  }

  private stopHeartbeatMonitoring(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleReconnect(): void {
    // Don't reconnect if manually disconnected
    if (this.isManualDisconnect) {
      return;
    }

    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached. WebSocket will not reconnect.');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`🔄 Reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      // Check again before reconnecting
      if (!this.isManualDisconnect) {
        this.connect().catch((error) => {
          console.error('Reconnection attempt failed:', error);
          // Will retry again if max attempts not reached
        });
      }
    }, delay);
  }

  private cleanupConnection(manual: boolean = true): void {
    if (manual) {
      this.isManualDisconnect = true;
    }

    // Stop heartbeat monitoring
    this.stopHeartbeatMonitoring();

    // Disconnect STOMP client
    if (this.stompClient) {
      try {
        if (manual) {
          this.stompClient.disconnect(() => {
            console.log('WebSocket disconnected');
          });
        }
        this.stompClient = null;
      } catch (error) {
        this.stompClient = null;
      }
    }

    // Always close the underlying socket — not just on manual disconnect.
    // Leaving it open causes "WebSocket is closed before connection established"
    // when React cleanup runs mid-handshake (StrictMode, fast navigation).
    if (this.socket) {
      try {
        const readyState = (this.socket as any).readyState;
        // CONNECTING=0, OPEN=1 — close both; CLOSING=2 and CLOSED=3 are already handled
        if (readyState === 0 || readyState === 1) {
          (this.socket as any).close(1000, manual ? 'Manual disconnect' : 'Cleanup');
        }
      } catch (error) {
        // Ignore — socket may already be gone
      }
      this.socket = null;
    }

    if (manual) {
      this.connected = false;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.disconnectListeners.forEach(listener => listener());
    }
  }

  onConnect(listener: () => void): () => void {
    this.connectionListeners.push(listener);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
    };
  }

  onDisconnect(listener: () => void): () => void {
    this.disconnectListeners.push(listener);
    return () => {
      this.disconnectListeners = this.disconnectListeners.filter(l => l !== listener);
    };
  }

  subscribeToAppointments(businessId: number, handler: MessageHandler<Appointment>): () => void {
    let subscription: any = null;
    let unsubscribeCalled = false;
    let connectListener: (() => void) | null = null;

    const doSubscribe = () => {
      if (unsubscribeCalled || !this.connected || !this.stompClient) {
        return;
      }

      // Unsubscribe from previous subscription if exists (e.g., on reconnection)
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          // Ignore errors from previous subscription cleanup
        }
      }

      try {
        subscription = this.stompClient.subscribe(
          `/topic/appointments/${businessId}`,
          (message: any) => {
            if (unsubscribeCalled) return;
            
            console.log(`📨 Received WebSocket message on /topic/appointments/${businessId}:`, message.body);
            try {
              const appointment = JSON.parse(message.body);
              console.log(`✅ Parsed appointment:`, appointment);
              handler(appointment);
            } catch (error) {
              console.error('❌ Error parsing appointment message:', error, message.body);
            }
          }
        );
        console.log(`✅ Subscribed to appointments for business ${businessId} on /topic/appointments/${businessId}`);
      } catch (error) {
        console.error('Error subscribing to appointments:', error);
      }
    };

    // If already connected, subscribe immediately
    if (this.connected && this.stompClient) {
      doSubscribe();
    } else {
      // Wait for connection
      console.log('WebSocket not connected. Subscription will be attempted on connect.');
      
      // Set up connection listener
      connectListener = this.onConnect(() => {
        if (!unsubscribeCalled) {
          setTimeout(doSubscribe, 200); // Small delay to ensure STOMP is ready
        }
      });
      
      // Try to connect if not already connecting
      if (!this.isConnecting) {
        this.connect().catch((error) => {
          if (!unsubscribeCalled) {
            console.error('Failed to connect WebSocket for subscription:', error);
          }
        });
      }
    }

    // Return unsubscribe function
    return () => {
      unsubscribeCalled = true;
      
      // Remove connection listener
      if (connectListener) {
        connectListener();
        connectListener = null;
      }
      
      // Unsubscribe from topic
      if (subscription) {
        try {
          subscription.unsubscribe();
          console.log(`Unsubscribed from appointments for business ${businessId}`);
        } catch (error) {
          console.error('Error unsubscribing from appointments:', error);
        }
        subscription = null;
      }
    };
  }

  subscribeToStaffAppointments(staffId: number, handler: MessageHandler<Appointment>): () => void {
    if (!this.connected || !this.stompClient) {
      return () => {};
    }

    const subscription = this.stompClient.subscribe(
      `/topic/appointments/staff/${staffId}`,
      (message: any) => {
        try {
          const appointment = JSON.parse(message.body);
          handler(appointment);
        } catch (error) {
          console.error('Error parsing staff appointment message:', error);
        }
      }
    );

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }

  subscribeToSales(businessId: number, handler: MessageHandler<Sale>): () => void {
    if (!this.connected || !this.stompClient) {
      return () => {};
    }

    const subscription = this.stompClient.subscribe(
      `/topic/sales/${businessId}`,
      (message: any) => {
        try {
          const sale = JSON.parse(message.body);
          handler(sale);
        } catch (error) {
          console.error('Error parsing sale message:', error);
        }
      }
    );

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }

  subscribeToTimeOffs(businessId: number, handler: MessageHandler<any>): () => void {
    let subscription: any = null;
    let unsubscribeCalled = false;
    let connectListener: (() => void) | null = null;

    const doSubscribe = () => {
      if (unsubscribeCalled || !this.connected || !this.stompClient) return;
      if (subscription) {
        try { subscription.unsubscribe(); } catch { /* ignore */ }
      }
      try {
        subscription = this.stompClient.subscribe(
          `/topic/time-off/${businessId}`,
          (message: any) => {
            if (unsubscribeCalled) return;
            try {
              handler(JSON.parse(message.body));
            } catch (error) {
              console.error('Error parsing time off message:', error);
            }
          }
        );
      } catch (error) {
        console.error('Error subscribing to time-offs:', error);
      }
    };

    if (this.connected && this.stompClient) {
      doSubscribe();
    } else {
      connectListener = this.onConnect(() => {
        if (!unsubscribeCalled) setTimeout(doSubscribe, 200);
      });
      if (!this.isConnecting) {
        this.connect().catch(() => {});
      }
    }

    return () => {
      unsubscribeCalled = true;
      if (connectListener) { connectListener(); connectListener = null; }
      if (subscription) {
        try { subscription.unsubscribe(); } catch { /* ignore */ }
        subscription = null;
      }
    };
  }

  disconnect(): void {
    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Cleanup connection (manual disconnect)
    this.cleanupConnection(true);
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const websocketService = new WebSocketService();



