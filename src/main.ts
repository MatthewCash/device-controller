import { Device, DeviceStatus } from './Device';
import config from '../config.json';
import { startHttpServer } from './interface/http';
import { startWebSocketServer, propagateWebsocketUpdate } from './interface/ws';
import { deviceControllers, loadDeviceControllers } from './controllers';
import {
    DeviceControllerConfig,
    DeviceControllerClass
} from './DeviceController';
import { TpLinkBulbGroup } from './tplink/TpLinkBulbGroup';

// Notify clients device has been updated
export interface DeviceUpdate {
    name: Device['name'];
    id: Device['id'];
    status: DeviceStatus;
    tags?: Device['tags'];
    capabilities?: Device['capabilities'];
}

// Client requests server to update device
export interface DeviceUpdateRequest {
    name: Device['name'];
    id: Device['id'];
    requestedState: DeviceStatus['state'];
}

interface DeviceConfig {
    name: Device['name'];
    id: Device['id'];
    controller: {
        id: DeviceControllerClass['id'];
        config?: DeviceControllerConfig;
    };
    tags?: Device['tags'];
    capabilities?: Device['capabilities'];
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

        const { name, id, tags, capabilities } = deviceConstructor;

        devices.set(
            deviceConstructor.id,
            new Device({
                name,
                id,
                tags,
                capabilities,
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

// Notify clients device has been updated
export const propagateUpdateToClients = (update: DeviceUpdate) => {
    propagateWebsocketUpdate(update);
};

const main = async (...args: string[]) => {
    console.log('Starting device-controller');

    TpLinkBulbGroup.loadLightingEffects();

    startWebSocketServer();
    startHttpServer();

    await loadDeviceControllers();

    loadDevices(config.devices as unknown as DeviceConfig[]);
};

if (require.main === module) {
    main(...process.argv.slice(2));
}
