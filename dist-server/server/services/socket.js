"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENTS = exports.emitEvent = exports.setSocketIO = void 0;
let io = null;
const setSocketIO = (socketIO) => {
    io = socketIO;
};
exports.setSocketIO = setSocketIO;
const emitEvent = (event, data, facilityId) => {
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
exports.emitEvent = emitEvent;
exports.EVENTS = {
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
};
