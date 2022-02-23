import { Device, DeviceStatus } from './Device';
import config from './config.json';
import { startHttpServer } from './interface/http';
import { startWebSocketServer, propagateWebsocketUpdate } from './interface/ws';
import { deviceControllers, loadDeviceControllers } from './controllers';
import {
    DeviceControllerConfig,
    DeviceControllerClass
} from './DeviceController';

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

interface DeviceConfig {
    name: Device['name'];
    id: Device['id'];
    controller: {
        id: DeviceControllerClass['id'];
        config?: DeviceControllerConfig;
    };
    tags?: Device['tags'];
}

export const devices = new Map<Device['id'], Device>();

const loadDevices = (devicesConfig: DeviceConfig[]) => {
    devicesConfig.forEach(deviceConstructor => {
        const controllerId = deviceConstructor?.controller?.id;

        if (!controllerId) {
            console.warn(
                `Device ${deviceConstructor.id} has no specified controller, using loopback!`
            );
        }

        const controllerConstructor = deviceControllers.get(
            controllerId ?? 'loopback'
        );

        const controller = new controllerConstructor(
            deviceConstructor?.controller?.config
        );

        const { name, id, tags } = deviceConstructor;

        devices.set(
            deviceConstructor.id,
            new Device({
                name,
                id,
                tags,
                controller
            })
        );

        console.log(`Loaded device ${deviceConstructor.id}`);
    });
};

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

const main = async (...args: string[]) => {
    console.log('Starting device-controller');

    startWebSocketServer();
    startHttpServer();

    await loadDeviceControllers();

    loadDevices(config.devices as DeviceConfig[]);
};

if (require.main === module) {
    main(...process.argv.slice(2));
}
