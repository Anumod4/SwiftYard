import { Server } from "socket.io";

let io: Server | null = null;

export const setSocketIO = (socketIO: Server) => {
  io = socketIO;
};

export const emitEvent = (event: string, data: any, facilityId?: string) => {
  if (!io) {
    console.warn("[Socket.IO] Not initialized");
    return;
  }

  if (facilityId) {
    io.to(`facility:${facilityId}`).emit(event, data);
  }

  io.emit(event, data);

  console.log(`[Socket.IO] Emitted ${event}`, facilityId ? `to facility:${facilityId}` : "to all");
};

export const EVENTS = {
  APPOINTMENT_CREATED: "appointment:created",
  APPOINTMENT_UPDATED: "appointment:updated",
  APPOINTMENT_CANCELLED: "appointment:cancelled",
  APPOINTMENT_CHECKED_IN: "appointment:checkedIn",
  APPOINTMENT_CHECKED_OUT: "appointment:checkedOut",
  TRAILER_CREATED: "trailer:created",
  TRAILER_UPDATED: "trailer:updated",
  TRAILER_GATE_OUT: "trailer:gateOut",
  TRAILER_MOVED_TO_YARD: "trailer:movedToYard",
  DRIVER_CREATED: "driver:created",
  DRIVER_UPDATED: "driver:updated",
  DRIVER_DELETED: "driver:deleted",
  CARRIER_CREATED: "carrier:created",
  CARRIER_UPDATED: "carrier:updated",
  CARRIER_DELETED: "carrier:deleted",
  RESOURCE_CREATED: "resource:created",
  RESOURCE_UPDATED: "resource:updated",
  RESOURCE_CLEARED: "resource:cleared",
  USER_CREATED: "user:created",
  USER_UPDATED: "user:updated",
  USER_DELETED: "user:deleted",
} as const;
