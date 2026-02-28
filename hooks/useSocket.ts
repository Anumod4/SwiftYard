import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000';

export interface SocketEvent {
  event: string;
  data: any;
}

export const useSocket = (facilityId?: string, token?: string) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SocketEvent | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setIsConnected(true);

      if (facilityId) {
        socket.emit('join-facility', facilityId);
        console.log('[Socket] Joined facility:', facilityId);
      }
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
    });

    const handleEvent = (event: string, data: any) => {
      console.log('[Socket] Event received:', event, data);
      setLastEvent({ event, data });
    };

    const events = [
      'appointment:created',
      'appointment:updated',
      'appointment:cancelled',
      'appointment:checkedIn',
      'appointment:checkedOut',
      'trailer:created',
      'trailer:updated',
      'trailer:gateOut',
      'trailer:movedToYard',
      'driver:created',
      'driver:updated',
      'driver:deleted',
      'carrier:created',
      'carrier:updated',
      'carrier:deleted',
      'resource:created',
      'resource:updated',
      'resource:cleared',
    ];

    events.forEach((event) => {
      socket.on(event, (data) => handleEvent(event, data));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, facilityId]);

  const joinFacility = useCallback((newFacilityId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join-facility', newFacilityId);
    }
  }, [isConnected]);

  return {
    socket: socketRef.current,
    isConnected,
    lastEvent,
    joinFacility,
  };
};
