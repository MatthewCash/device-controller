import express from 'express';
import { SmartApp } from '@smartthings/smartapp';
import mongoose from 'mongoose';
import { ContextStore } from './store';
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

const app = express();
app.use(express.json());

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

const devices: Device[] = [];

export const smartapp = new SmartApp()
    .contextStore(new ContextStore())
    .configureI18n()
    .clientId(process.env.SMARTTHINGS_CLIENT_ID)
    .clientSecret(process.env.SMARTTHINGS_CLIENT_SECRET)
    .page('mainPage', (context, page) => {
        page.section('switch', section => {
            section
                .deviceSetting('switch')
                .capabilities(['switch'])
                .multiple(true)
                .permissions('rWx')
                .name('Devices');
        }).name('Choose devices to monitor');
    })
    .updated(async context => {
        await context.api.subscriptions.delete();
        context.api.subscriptions.subscribeToDevices(
            context.config.switch,
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

const connectDatabase = async () => {
    console.log('Connecting to database');
    await mongoose.connect('mongodb://127.0.0.1/computer-control', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log('Database Connected!');
};

connectDatabase();

app.post('/', (req, res) => {
    smartapp.handleHttpCallback(req, res);
});

app.get('/', (req, res) => {
    res.status(400).send(
        'This is an API endpoint. No usable web interface lives here.'
    );
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

const main = () => {
    const port = Number(process.env.PORT ?? 3000);
    const host = process.env.HOST ?? '0.0.0.0';

    app.listen(port, host);

    console.log(`[Ready] Listening on http://${host}:${port}`);
};

main();
