import { EventEmitter } from 'stream';
import {
    InternalDeviceUpdateRequest,
    propagateDeviceUpdate,
    propagateInternalDeviceUpdate
} from './main';

interface DeviceConstructor {
    name: Device['name'];
    id: Device['id'];
    loopback: Device['loopback'];
}

export declare interface Device {
    on(
        event: 'update',
        listener: (update: InternalDeviceUpdateRequest) => void
    ): this;
}

export class Device extends EventEmitter {
    name: string;
    id: string;
    loopback: boolean;
    status: boolean;

    constructor({ name, id, loopback }: DeviceConstructor) {
        super();

        this.name = name;
        this.id = id;
        this.loopback = loopback;
    }

    toggleStatus() {
        this.updateStatus(!this.status);
    }

    updateStatus(newStatus: boolean) {
        const isUpdate = newStatus !== this.status;

        if (this.loopback) {
            this.updateStatusInternal(newStatus);

            this.propagateUpdate(newStatus, isUpdate);
        }

        this.propagateInternalUpdate(newStatus, isUpdate);
    }

    updateStatusInternal(newStatus: boolean) {
        this.emit('update', newStatus);

        this.status = newStatus;
    }

    propagateUpdate(updatedStatus: boolean, isUpdate: boolean) {
        propagateDeviceUpdate({
            name: this.name,
            id: this.id,
            status: updatedStatus,
            updated: isUpdate
        });
    }

    propagateInternalUpdate(updatedStatus: boolean, isUpdate: boolean) {
        const update = {
            name: this.name,
            id: this.id,
            status: updatedStatus,
            updated: isUpdate
        };

        propagateInternalDeviceUpdate(update);
    }
}