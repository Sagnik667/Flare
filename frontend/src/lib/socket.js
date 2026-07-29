import { io } from 'socket.io-client';

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
  return '';
};

const SOCKET_URL = getSocketUrl();

class SocketService {
  socket = null;
  listeners = new Map();

  connect(accessToken) {
    if (this.socket) {
      if (accessToken) {
        this.socket.auth = { token: accessToken };
      }
      if (this.socket.disconnected) {
        this.socket.connect();
      }
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: accessToken ? { token: accessToken } : undefined,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected successfully:', this.socket.id);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    // Re-register any pre-existing listeners if socket was recreated
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket.on(event, callback);
      });
    });

    return this.socket;
  }

  updateToken(accessToken) {
    if (this.socket) {
      this.socket.auth = { token: accessToken };
      // Force reconnect to send new token
      if (this.socket.connected) {
        this.socket.disconnect().connect();
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;

    const list = this.listeners.get(event);
    const index = list.indexOf(callback);
    if (index !== -1) {
      list.splice(index, 1);
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, ...args) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, ...args);
    } else {
      console.warn(`Socket not connected. Cannot emit event: ${event}`);
    }
  }
}

export const socketService = new SocketService();
export default socketService;
