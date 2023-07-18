import { TypedEmitter } from 'tiny-typed-emitter';
import { WebSocket } from 'ws';
import { Device, DeviceStatus } from '../Device';

import {
    DeviceController,
    DeviceControllerClass,
    DeviceControllerConfig,
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
        auth?: {
            authorized?: boolean;
            token?: string;
        };
    };
    errors?: any[];
}

interface OutboundSocketMessage {
    commands?: {
        controllerDeviceUpdateRequest?: ControllerDeviceUpdateRequest;
        watchDeviceIds?: string[];
    }[];
    connection?: {
        pong?: true;
        auth?: {
            authorized?: boolean;
            token?: string;
        };
    };
    errors?: any[];
}

interface RemoteControllerConfig extends DeviceControllerConfig {
    deviceId: string;
    address: string;
    tokens: {
        verify: string;
        provide: string;
    };
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
    private tokens: RemoteControllerConfig['tokens'];

    private ws?: WebSocket;
    private wsAlive?: boolean;
    private wsAuthorized?: boolean;
    private wsReconnectTimer?: NodeJS.Timeout;

    constructor(config: RemoteControllerConfig) {
        super();

        this.propagate = config?.propagate ?? true;
        this.monitor = config?.monitor ?? true;
        this.deviceId = config?.deviceId;
        this.address = config?.address;
        this.tokens = config?.tokens;

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

    private notifyOnline(online: DeviceStatus['online']): void {
        if (!this.monitor) return;

        this.emit('onlineUpdate', online);
    }

    private startConnection() {
        if (!this.wsReconnectTimer) {
            this.wsReconnectTimer = setInterval(() => {
                if (!this.wsAlive) this.connectToWebSocket();

                this.wsAlive = false;
            }, 5000);
        }

        if (this.ws?.readyState !== WebSocket.OPEN) this.connectToWebSocket();
    }

    private connectToWebSocket() {
        if (this.ws?.readyState !== WebSocket.CLOSED) this.ws?.close();

        this.wsAlive = false;
        this.wsAuthorized = false;
        this.ws = new WebSocket(this.address);

        this.ws.on('open', this.wsOnConnect.bind(this));
        this.ws.on('message', this.wsOnMessage.bind(this));
        this.ws.on('close', this.wsOnClose.bind(this));
        this.ws.on('error', this.wsOnError.bind(this));
    }

    private wsOnConnect(): void {
        this.wsSendMessage({
            commands: [
                {
                    watchDeviceIds: [this.deviceId]
                }
            ],
            connection: {
                auth: {
                    token: this.tokens.provide
                }
            }
        });
    }

    private wsOnAuthorized() {
        console.log(
            `Remote Controller connected and authorized with ${this.address} for "${this.deviceId}"`
        );
        this.wsSendMessage({
            commands: [
                {
                    watchDeviceIds: [this.deviceId]
                }
            ],
            connection: { auth: { authorized: true } }
        });
    }

    private wsOnMessage(message: string): void {
        let data: InboundSocketMessage;
        try {
            data = JSON.parse(message);
        } catch {
            return this.wsSendMessage({ errors: ['Invalid JSON!'] });
        }

        if (!data) return this.wsSendMessage({ errors: ['No data!'] });

        // Check if remote's authorization token is provided
        if (data?.connection?.auth?.token) {
            this.wsAuthorized =
                data.connection.auth.token === this.tokens.verify;

            if (this.wsAuthorized) {
                this.wsOnAuthorized();
            }
        }

        // Send our authorization token if requested
        if (data?.connection?.auth?.authorized === false) {
            this.wsSendMessage({
                connection: {
                    auth: {
                        token: this.tokens.provide
                    }
                }
            });
        }

        // Return if not authorized
        if (this.wsAuthorized === false) {
            return this.wsSendMessage({
                connection: {
                    auth: {
                        authorized: false
                    }
                }
            });
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
        this.notifyOnline(false);
        console.warn(`Remote Controller disconnected from ${this.address}!`);
    }

    private wsOnError(error: Error): void {
        console.warn(`Remote Controller disconnected from ${this.address}!:`);
        console.error(error);
    }

    private wsSendMessage(message: OutboundSocketMessage): void {
        if (this.ws?.readyState !== WebSocket.OPEN) return;

        this.ws?.send(JSON.stringify(message));
    }
};
