import { TypedEmitter } from 'tiny-typed-emitter';
import { DeviceController } from './DeviceController';

import { DeviceUpdate, propagateUpdateToClients } from './main';

interface DeviceConstructor {
    name: Device['name'];
    id: Device['id'];
    controller?: DeviceController;
    tags?: Device['tags'];
}

interface DeviceEvents {
    update: (update: DeviceUpdate) => void;
}

export interface DeviceStatus {
    online: boolean; // Device is reachable
    state: any; // Controlled state
    changingTo?: DeviceStatus['state']; // Device is changing to state
}

export class Device extends TypedEmitter<DeviceEvents> {
    name: string;
    id: string;
    controller?: DeviceController;
    status: DeviceStatus;
    tags?: string[];

    constructor({ name, id, controller, tags }: DeviceConstructor) {
        super();

        this.name = name;
        this.id = id;
        this.controller = controller;
        this.tags = tags;
        this.status = {
            online: false,
            state: false,
            changingTo: null
        };

        if (this.controller?.monitor) {
            this.controller?.on('update', this.updateStateInternal.bind(this));
            this.controller?.on(
                'statusUpdate',
                this.updateStatusInternal.bind(this)
            );
        }
    }

    // Trigger a device update from status change
    requestStateUpdate(requestedState: DeviceStatus['state']) {
        if (this.controller?.propagate) {
            this.controller.updateState(requestedState, this);
        }
    }

    // Change the device state on server and notify clients
    updateStateInternal(state: DeviceStatus['state']) {
        this.status = {
            online: true,
            state: state,
            changingTo: null
        };

        const update: DeviceUpdate = {
            name: this.name,
            id: this.id,
            status: this.status,
            tags: this.tags
        };

        this.emit('update', update);

        propagateUpdateToClients(update);
    }

    private updateStatusInternal(status: DeviceStatus) {
        this.status = status;

        const update: DeviceUpdate = {
            name: this.name,
            id: this.id,
            status: this.status,
            tags: this.tags
        };

        this.emit('update', update);

        propagateUpdateToClients(update);
    }
}
