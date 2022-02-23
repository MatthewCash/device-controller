import { WebSocket } from 'ws';
import { TypedEmitter } from 'tiny-typed-emitter';

import {
    DeviceController,
    DeviceControllerClass,
    DeviceControllerEvents
} from '../DeviceController';

const lightControllerWsUrl =
    process.env.LIGHT_CONTROLLER_WS_URL || 'ws://localhost:1728';

interface LightControllerConfig {
    propagate?: boolean;
    monitor?: boolean;
}
export const controller: DeviceControllerClass = class LightController
    extends TypedEmitter<DeviceControllerEvents>
    implements DeviceController
{
    static readonly id = 'light-controller';

    propagate: boolean;
    monitor: boolean;

    private static instances: LightController[] = [];
    private static ws: WebSocket;
    private static wsReconnectTimer: NodeJS.Timeout;

    constructor(config: LightControllerConfig) {
        super();

        this.propagate = config?.propagate ?? true;
        this.monitor = config?.monitor ?? true;

        LightController.startWebSocketConnection();

        LightController.instances.push(this);
    }

    updateState(state: boolean): void {
        if (!this.propagate) return;

        LightController.wsSendMessage({
            setPower: state
        });
    }

    private notifyState(state: boolean): void {
        if (!this.monitor) return;

        this.emit('update', state);
    }

    static startWebSocketConnection(): void {
        if (!this.wsReconnectTimer) {
            this.wsReconnectTimer = setInterval(() => {
                if (this.ws?.readyState === WebSocket.OPEN) return;
                this.connectToLightController();
            }, 3000);
        }

        if (this.ws?.readyState !== WebSocket.OPEN)
            this.connectToLightController();
    }

    static connectToLightController(): void {
        this.ws?.close();

        this.ws = new WebSocket(lightControllerWsUrl);

        this.ws.on('open', this.wsOnConnect.bind(this));
        this.ws.on('message', this.wsOnMessage.bind(this));
        this.ws.on('close', this.wsOnClose.bind(this));
        this.ws.on('error', this.wsOnError.bind(this));
    }

    static wsOnConnect(): void {
        const authToken = process.env.LIGHTING_AUTHORIZATION as string;
        if (authToken) {
            this.ws.send(
                JSON.stringify({
                    authorization: authToken
                })
            );
        }

        console.log('Lighting WebSocket Connected!');
    }

    static wsOnMessage(message: string): void {
        let data;
        try {
            data = JSON.parse(message);
        } catch {
            return this.ws.send('Invalid JSON!');
        }

        if (data?.status?.power != null) {
            this.instances
                .filter(instance => instance.propagate)
                .forEach(instance => instance.notifyState(data.status.power));
        }
    }

    static wsOnClose(): void {
        console.log('Lighting WebSocket Disconnected!');
    }

    static wsOnError(error: Error): void {
        console.warn(error);
    }

    static wsSendMessage(message: any): void {
        this.ws.send(JSON.stringify(message));
    }
};
