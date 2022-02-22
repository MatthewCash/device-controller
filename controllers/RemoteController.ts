import { TypedEmitter } from 'tiny-typed-emitter';
import { Device } from '../Device';

import { DeviceController, DeviceControllerEvents } from '../DeviceController';
import { propagateWebsocketInternalUpdate } from '../interface/ws';
import { InternalDeviceUpdateRequest } from '../main';

interface RemoteControllerConfig {
    propagate?: boolean;
    monitor?: boolean;
}

export const id = 'remote';

class RemoteController
    extends TypedEmitter<DeviceControllerEvents>
    implements DeviceController
{
    propagate: boolean;
    monitor: boolean;

    constructor(config: RemoteControllerConfig) {
        super();

        this.propagate = config?.propagate ?? true;
        this.monitor = config?.monitor ?? true;
    }

    updateState(state: boolean, device: Device): void {
        if (!this.propagate) return;

        const update: InternalDeviceUpdateRequest = {
            name: device.name,
            id: device.id,
            tags: device.tags,
            requestedState: state
        };

        propagateWebsocketInternalUpdate(update);
    }

    private notifyState(state: boolean): void {
        if (!this.monitor) return;

        this.emit('update', state);
    }
}

export const controller = RemoteController;
