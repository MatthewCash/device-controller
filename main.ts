import { Device } from './Device';
import deviceConstructors from './devices.json';
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
}

export interface InternalDeviceUpdate {
    name: Device['name'];
    id: Device['id'];
    status: Device['status'];
}

export const devices = new Map<Device['id'], Device>();

deviceConstructors.forEach(deviceConstructor => {
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

export const propagateDeviceUpdate = (update: DeviceUpdate) => {
    propagateWebsocketUpdate(update);
};

export const propagateInternalDeviceUpdate = (
    update: InternalDeviceUpdateRequest
) => {
    propagateWebsocketInternalUpdate(update);
};

startWebSocketServer();
startHttpServer();
