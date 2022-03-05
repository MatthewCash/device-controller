import { TypedEmitter } from 'tiny-typed-emitter';
import { DeviceStatus } from '../Device';

import {
    DeviceController,
    DeviceControllerClass,
    DeviceControllerConfig,
    DeviceControllerEvents
} from '../DeviceController';

interface LoopbackControllerConfig extends DeviceControllerConfig {}

export const controller: DeviceControllerClass = class LoopbackController
    extends TypedEmitter<DeviceControllerEvents>
    implements DeviceController
{
    static readonly id = 'loopback';

    propagate: boolean;
    monitor: boolean;

    constructor(config: LoopbackControllerConfig) {
        super();

        this.propagate = config?.propagate ?? true;
        this.monitor = config?.monitor ?? true;
    }

    updateState(state: DeviceStatus['state']): void {
        if (!this.propagate) return;

        this.notifyState(state);
    }

    private notifyState(state: DeviceStatus['state']): void {
        if (!this.monitor) return;

        this.emit('update', state);
    }
};
