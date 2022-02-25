import { TypedEmitter } from 'tiny-typed-emitter';
import { Device, DeviceStatus } from '../Device';

import {
    DeviceController,
    DeviceControllerClass,
    DeviceControllerEvents
} from '../DeviceController';
import { propagateWebsocketInternalUpdate } from '../interface/ws';
import { InternalDeviceUpdateRequest } from '../main';

interface RemoteControllerConfig {
    propagate?: boolean;
    monitor?: boolean;
}

export const controller: DeviceControllerClass = class RemoteController
    extends TypedEmitter<DeviceControllerEvents>
    implements DeviceController
{
    static readonly id = 'remote';

    propagate: boolean;
    monitor: boolean;

    constructor(config: RemoteControllerConfig) {
        super();

        this.propagate = config?.propagate ?? true;
        this.monitor = config?.monitor ?? true;
    }

    updateState(state: DeviceStatus['state'], device: Device): void {
        if (!this.propagate) return;

        const update: InternalDeviceUpdateRequest = {
            name: device.name,
            id: device.id,
            tags: device.tags,
            requestedState: state
        };

        propagateWebsocketInternalUpdate(update);
    }

    private notifyState(state: DeviceStatus['state']): void {
        if (!this.monitor) return;

        this.emit('update', state);
    }
};
