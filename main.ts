import { Device, DeviceStatus } from './Device';
import config from './config.json';
import { startHttpServer } from './interface/http';
import {
    startWebSocketServer,
    propagateWebsocketUpdate,
    propagateWebsocketInternalUpdate
} from './interface/ws';

// Notify clients device has been updated
export interface DeviceUpdate {
    name: Device['name'];
    id: Device['id'];
    status: DeviceStatus;
    updated?: boolean;
    tags?: Device['tags'];
}

// Client requests server to update device
export interface DeviceUpdateRequest {
    name: Device['name'];
    id: Device['id'];
    requestedState: DeviceStatus['state'];
}

// Notify controllers device should be updated
export interface InternalDeviceUpdateRequest {
    name: Device['name'];
    id: Device['id'];
    requestedState: DeviceStatus['state'];
    updated?: boolean;
    tags?: Device['tags'];
}

// Controller reports new device state
export interface InternalDeviceUpdate {
    name: Device['name'];
    id: Device['id'];
    status: DeviceStatus;
}

export const devices = new Map<Device['id'], Device>();

config.devices.forEach(deviceConstructor => {
    devices.set(deviceConstructor.id, new Device(deviceConstructor));
    console.log(`Loaded device ${deviceConstructor.id}`);
});

export const updateDevice = (update: DeviceUpdateRequest) => {
    const device = devices.get(update?.id);
    if (!device) return;

    device.requestStateUpdate(update.requestedState);
};

export const updateDeviceInternal = (update: InternalDeviceUpdate) => {
    const device = devices.get(update?.id);
    if (!device) return;

    device.updateStateInternal(update.status.state);
    propagateUpdateToClients(update);
};

// Notify clients device has been updated
export const propagateUpdateToClients = (update: DeviceUpdate) => {
    propagateWebsocketUpdate(update);
};

// Notify controllers device should be updated
export const propogateUpdateToControllers = (
    update: InternalDeviceUpdateRequest
) => {
    propagateWebsocketInternalUpdate(update);
};

startWebSocketServer();
startHttpServer();
