import { Device } from './Device';
import config from './config.json';
import { startHttpServer } from './interface/http';
import {
    startWebSocketServer,
    propagateWebsocketUpdate,
    propagateWebsocketInternalUpdate
} from './interface/ws';

export interface DeviceUpdate {
    name: Device['name'];
    id: Device['id'];
    status: Device['status'];
    updated?: boolean;
    tags?: Device['tags'];
}

export interface DeviceUpdateRequest {
    name: Device['name'];
    id: Device['id'];
    status: Device['status'];
}

export interface InternalDeviceUpdateRequest {
    name: Device['name'];
    id: Device['id'];
    status: Device['status'];
    updated?: boolean;
    tags?: Device['tags'];
}

export interface InternalDeviceUpdate {
    name: Device['name'];
    id: Device['id'];
    status: Device['status'];
}

export const devices = new Map<Device['id'], Device>();

config.devices.forEach(deviceConstructor => {
    devices.set(deviceConstructor.id, new Device(deviceConstructor));
    console.log(`Loaded device ${deviceConstructor.id}`);
});

export const updateDevice = (update: DeviceUpdateRequest) => {
    const device = devices.get(update?.id);
    if (!device) return;

    device.updateStatus(update.status);
};

export const updateDeviceInternal = (update: InternalDeviceUpdate) => {
    const device = devices.get(update?.id);
    if (!device) return;

    device.updateStatusInternal(update.status);
    propagateDeviceUpdate(update);
};

// Notify clients device has been updated
export const propagateDeviceUpdate = (update: DeviceUpdate) => {
    propagateWebsocketUpdate(update);
};

// Notify controllers device should be updated
export const propagateInternalDeviceUpdate = (
    update: InternalDeviceUpdateRequest
) => {
    propagateWebsocketInternalUpdate(update);
};

startWebSocketServer();
startHttpServer();
