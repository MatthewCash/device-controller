import axios from 'axios';
import { SmartApp } from '@smartthings/smartapp';
import { ContextStore } from './database/store';
import { sendDevices, sendDeviceUpdate } from './webSocket';
import { EventEmitter } from 'events';

export const appId = process.env.SMARTTHINGS_APP_ID;

class Device {
    id: string;
    failures: number;
    online: boolean;
    name: string;
    constructor(id: string, name: string) {
        this.id = id;
        this.failures = 0;
        this.online = null;
        this.name = name;
    }
}

class DevicePollingEvents extends EventEmitter {}
declare interface DevicePollingEvents {
    on(event: string, listener: (device: Device) => Promise<void> | void);
}
export const devicePollingListener = new DevicePollingEvents();

class DeviceStateEvents extends EventEmitter {}
declare interface DeviceStateEvents {
    on(event: string, listener: (value: boolean) => Promise<void> | void): this;
}
export const deviceStateListner = new DeviceStateEvents();

import './actions';
import './polling';

export const devices: Device[] = [];

export const smartapp = new SmartApp()
    .contextStore(new ContextStore())
    .configureI18n()
    .clientId(process.env.SMARTTHINGS_CLIENT_ID)
    .clientSecret(process.env.SMARTTHINGS_CLIENT_SECRET)
    .page('mainPage', (context, page) => {
        page.name('Device Controller Configuration');

        page.section('devices', section => {
            section.name('Control Devices');
            section
                .deviceSetting('devices')
                .capabilities(['switch'])
                .multiple(true)
                .permissions('rWx')
                .name('Devices');
        });

        page.section('scenes', section => {
            section.name('Control Scenes');
            section.sceneSetting('onScene').name('On Scene');
            section.sceneSetting('offScene').name('Off Scene');
        });
    })
    .updated(async context => {
        await context.api.subscriptions.delete();
        context.api.subscriptions.subscribeToDevices(
            context.config.devices,
            'switch',
            'switch',
            'switchHandler'
        );
    })
    .subscribedEventHandler('switchHandler', async (context, event) => {
        const deviceId = event.deviceId;
        const value = event.value === 'on';

        const device = devices.find(device => device.id === deviceId);
        if (!device) return console.warn('Could not find device ' + deviceId);

        if (
            devicePollingListener.rawListeners(deviceId).length &&
            value === device.online
        )
            return;

        console.log(`Sending ${value} for ${device.name} (${deviceId})`);
        device.online = value;

        deviceStateListner.emit(deviceId, value);

        sendDeviceUpdate(deviceId, value);
    });

const pollDevices = async () => {
    const contextDevices = await ContextStore.getDevices(appId);

    if (!(contextDevices instanceof Array)) {
        return console.warn('Unable to get devices from SmartThings!');
    }

    const deviceIds: string[] = contextDevices?.map(
        device => device.deviceConfig.deviceId
    );

    const initialDeviceCount = devices.length;

    deviceIds.forEach(async deviceId => {
        const context = await smartapp.withContext(appId);
        const contextDevice = await context.api.devices
            .getStatus(deviceId)
            .catch(() => null);
        if (!contextDevice) return;

        const deviceState =
            contextDevice?.components?.main?.switch?.switch?.value === 'on';

        const device = devices.find(device => device.id === deviceId);

        if (device) {
            if (device.online !== deviceState) {
                sendDeviceUpdate(deviceId, deviceState);
            }
            return;
        }

        const deviceInfo = await context.api.devices.get(deviceId);
        const deviceName = deviceInfo.label;

        if (devices.some(device => device.id === deviceId)) return;
        devices.push(new Device(deviceId, deviceName));

        if (initialDeviceCount != devices.length) {
            sendDevices();
        }
    });

    return Promise.all(
        devices.map(device => devicePollingListener.emit(device.id, device))
    );
};

setInterval(pollDevices, 250);

export const setDevice = async (id: string, state: boolean) => {
    const context = await smartapp.withContext(appId);
    const deviceConfig = context.config.devices.find(
        configDevice => configDevice.deviceConfig.deviceId === id
    );
    context.api.devices.sendCommand(
        deviceConfig,
        'switch',
        state ? 'on' : 'off'
    );
};

export const setScene = async (state: boolean) => {
    const context = await smartapp.withContext(appId);

    const onSceneId = context.config.onScene[0].sceneConfig.sceneId;
    const offSceneId = context.config.offScene[0].sceneConfig.sceneId;

    const sceneId = state ? onSceneId : offSceneId;

    axios(`https://api.smartthings.com/v1/scenes/${sceneId}/execute`, {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + process.env.SMARTTHINGS_SCENE_TOKEN
        }
    });
};

export const toggleScene = async () => {
    // Toggle is based on status of computer
    const computerDeviceId = 'cf3c2ecd-2c62-4a74-8078-fb0a01540354';
    const online = devices.find(device => device.id === computerDeviceId)
        .online;

    return setScene(!online);
};
