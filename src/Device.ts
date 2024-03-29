import { TypedEmitter } from 'tiny-typed-emitter';
import { DeviceController } from './DeviceController';

import { DeviceUpdate, propagateUpdateToClients } from './main';

interface DeviceConstructor {
    name: Device['name'];
    id: Device['id'];
    controller?: DeviceController;
    tags?: Device['tags'];
    capabilities?: Device['capabilities'];
}

interface DeviceEvents {
    update: (update: DeviceUpdate) => void;
}

export interface DeviceStatus {
    online: boolean; // Device is reachable
    state: any; // Controlled state
    changingTo?: DeviceStatus['state']; // Device is changing to state
}

interface SerializedDevice {
    name: Device['name'];
    id: Device['id'];
    tags?: Device['tags'];
    capabilities?: Device['capabilities'];
    status: DeviceStatus;
}

export class Device extends TypedEmitter<DeviceEvents> {
    name: string;
    id: string;
    controller?: DeviceController;
    status: DeviceStatus;
    tags?: string[];
    capabilities?: string[];

    constructor({
        name,
        id,
        controller,
        tags,
        capabilities
    }: DeviceConstructor) {
        super();

        this.name = name;
        this.id = id;
        this.controller = controller;
        this.tags = tags ?? [];
        this.capabilities = capabilities ?? [];

        this.status = {
            online: false,
            state: null,
            changingTo: null
        };

        if (this.controller?.monitor) {
            this.controller?.on('update', this.updateStateInternal.bind(this));
            this.controller?.on(
                'onlineUpdate',
                this.updateOnlineInternal.bind(this)
            );
            this.controller?.on(
                'statusUpdate',
                this.updateStatusInternal.bind(this)
            );
        }
    }

    serialize(): SerializedDevice {
        return {
            name: this.name,
            id: this.id,
            tags: this.tags,
            capabilities: this.capabilities,
            status: this.status
        };
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
            state,
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

    updateOnlineInternal(online: DeviceStatus['online']) {
        this.status = {
            online,
            state: online ? this.status.state : null,
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
