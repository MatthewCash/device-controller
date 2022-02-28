import { TypedEmitter } from 'tiny-typed-emitter';
import { WebSocket } from 'ws';
import { Device, DeviceStatus } from '../Device';

import {
    DeviceController,
    DeviceControllerClass,
    DeviceControllerEvents
} from '../DeviceController';

// Notify controllers device should be updated
export interface ControllerDeviceUpdateRequest {
    id: Device['id'];
    requestedState: DeviceStatus['state'];
}

// Controller reports new device state
export interface ControllerDeviceUpdate {
    id: Device['id'];
    status: DeviceStatus;
}

interface InboundSocketMessage {
    commands?: {
        controllerDeviceUpdate?: ControllerDeviceUpdate;
    }[];
    connection?: {
        ping?: true;
    };
}

interface OutboundSocketMessage {
    commands?: {
        controllerDeviceUpdateRequest?: ControllerDeviceUpdateRequest;
        watchDeviceIds?: string[];
    }[];
    connection?: {
        pong?: true;
    };
}

interface RemoteControllerConfig {
    propagate?: boolean;
    monitor?: boolean;
    deviceId: string;
    address: string;
}

export const controller: DeviceControllerClass = class RemoteController
    extends TypedEmitter<DeviceControllerEvents>
    implements DeviceController
{
    static readonly id = 'remote';

    propagate: boolean;
    monitor: boolean;
    address: string;
    deviceId: string;

    private ws?: WebSocket;
    private wsAlive?: boolean;
    private wsReconnectTimer?: NodeJS.Timeout;

    constructor(config: RemoteControllerConfig) {
        super();

        this.propagate = config?.propagate ?? true;
        this.monitor = config?.monitor ?? true;
        this.deviceId = config?.deviceId;
        this.address = config?.address;

        this.startConnection();
    }

    updateState(state: DeviceStatus['state']): void {
        if (!this.propagate) return;

        const update: ControllerDeviceUpdateRequest = {
            id: this.deviceId,
            requestedState: state
        };

        this.wsSendMessage({
            commands: [
                {
                    controllerDeviceUpdateRequest: update
                }
            ]
        });
    }

    private notifyStatus(status: DeviceStatus): void {
        if (!this.monitor) return;

        this.emit('statusUpdate', status);
    }

    private startConnection() {
        if (!this.wsReconnectTimer) {
            this.wsReconnectTimer = setInterval(() => {
                if (!this.wsAlive) this.connectToWebSocket();

                this.wsAlive = false;
            }, 3000);
        }

        if (this.ws?.readyState !== WebSocket.OPEN) this.connectToWebSocket();
    }

    private connectToWebSocket() {
        console.log('Devices Connecting to Remote controller...');

        this.ws?.close();

        this.wsAlive = false;
        this.ws = new WebSocket(this.address);

        this.ws.on('open', this.wsOnConnect.bind(this));
        this.ws.on('message', this.wsOnMessage.bind(this));
        this.ws.on('close', this.wsOnClose.bind(this));
        this.ws.on('error', this.wsOnError.bind(this));
    }

    private wsOnConnect(): void {
        console.log('Remote Controller WebSocket Connected!');

        this.wsSendMessage({
            commands: [
                {
                    watchDeviceIds: [this.deviceId]
                }
            ]
        });
    }

    private wsOnMessage(message: string): void {
        let data: InboundSocketMessage;
        try {
            data = JSON.parse(message);
        } catch {
            return this.ws.send('Invalid JSON!');
        }

        if (data?.connection?.ping === true) {
            this.wsAlive = true;
            this.wsSendMessage({ connection: { pong: true } });
        }

        data?.commands?.forEach(command => {
            if (command.controllerDeviceUpdate) {
                this.notifyStatus(command.controllerDeviceUpdate.status);
            }
        });
    }

    private wsOnClose(): void {
        console.log('Remote Controller WebSocket Disconnected!');
    }

    private wsOnError(error: Error): void {
        console.warn(error);
    }

    private wsSendMessage(message: OutboundSocketMessage): void {
        if (this.ws?.readyState !== WebSocket.OPEN) return;

        this.ws?.send(JSON.stringify(message));
    }
};
