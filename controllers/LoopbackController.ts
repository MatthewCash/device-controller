import { TypedEmitter } from 'tiny-typed-emitter';

import { DeviceController, DeviceControllerEvents } from '../DeviceController';

interface LoopbackControllerConfig {
    propagate?: boolean;
    monitor?: boolean;
}

export const id = 'loopback';

class LoopbackController
    extends TypedEmitter<DeviceControllerEvents>
    implements DeviceController
{
    propagate: boolean;
    monitor: boolean;

    constructor(config: LoopbackControllerConfig) {
        super();

        this.propagate = config?.propagate ?? true;
        this.monitor = config?.monitor ?? true;
    }

    updateState(state: boolean): void {
        if (!this.propagate) return;

        this.notifyState(state);
    }

    private notifyState(state: boolean): void {
        if (!this.monitor) return;

        this.emit('update', state);
    }
}

export const controller = LoopbackController;
