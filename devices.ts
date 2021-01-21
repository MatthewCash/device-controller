import axios from 'axios';
import { SmartApp } from '@smartthings/smartapp';
import { ContextStore } from './database/store';
import { EventEmitter } from 'events';

export const appId = process.env.SMARTTHINGS_APP_ID;

class Device {
    id: string;
    failures: number;
    online: boolean;
    constructor(id: string) {
        this.id = id;
        this.failures = 0;
        this.online = null;
    }
}

class devicePolling extends EventEmitter {}
declare interface devicePolling {
    on(event: string, listener: (device: Device) => Promise<void> | void);
}
export const devicePollingListener = new devicePolling();

class deviceStateEvents extends EventEmitter {}
declare interface deviceStateEvents {
    on(event: string, listener: (value: boolean) => Promise<void> | void): this;
}
export const deviceStateListner = new deviceStateEvents();

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

        if (value !== device.online) {
            console.log(`Sending ${value} for ${deviceId}`);
            deviceStateListner.emit(deviceId, value);
        }
    });

const pollDevices = async () => {
    const contextDevices = await ContextStore.getDevices(appId);
    const deviceIds: string[] = contextDevices.map(
        device => device.deviceConfig.deviceId
    );

    deviceIds.forEach(deviceId => {
        if (devices.some(device => device.id === deviceId)) return;
        devices.push(new Device(deviceId));
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
