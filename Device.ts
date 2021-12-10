import { EventEmitter } from 'stream';
import {
    InternalDeviceUpdateRequest,
    propagateDeviceUpdate,
    propagateInternalDeviceUpdate
} from './main';
import { TpLinkDevice } from './tplink/TpLinkDevice';

interface DeviceConstructor {
    name: Device['name'];
    id: Device['id'];
    loopback?: Device['loopback'];
    tplink?: Device['tplink'];
    tags?: Device['tags'];
}

export declare interface Device {
    on(
        event: 'update',
        listener: (update: InternalDeviceUpdateRequest) => void
    );
}

interface TpLinkConfig {
    ipAddress: string;
    propagate?: boolean;
    monitor?: boolean;
}

export class Device extends EventEmitter {
    name: string;
    id: string;
    loopback?: boolean;
    tplink?: TpLinkConfig;
    tplinkDevice?: TpLinkDevice;
    status: boolean;
    tags?: string[];

    constructor({ name, id, loopback, tplink, tags }: DeviceConstructor) {
        super();

        this.name = name;
        this.id = id;
        this.loopback = loopback;
        this.tplink = tplink;
        this.tags = tags;
        this.status = false;

        if (tplink?.ipAddress) this.loadTplinkDevice();
    }

    loadTplinkDevice() {
        this.tplinkDevice = new TpLinkDevice(
            this.tplink?.ipAddress,
            this.tplink?.monitor
        );

        this.tplinkDevice.on('update', newStatus => {
            this.updateStatusInternal(newStatus);
            this.propagateUpdate(newStatus, true);
        });
    }

    toggleStatus() {
        this.updateStatus(!this.status);
    }

    // Trigger a device update from status change
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

    // Notify clients device has been updated
    propagateUpdate(updatedStatus: boolean, isUpdate: boolean) {
        propagateDeviceUpdate({
            name: this.name,
            id: this.id,
            status: updatedStatus,
            updated: isUpdate,
            tags: this.tags
        });
    }

    // Notify controllers device should be updated
    propagateInternalUpdate(updatedStatus: boolean, isUpdate: boolean) {
        const update: InternalDeviceUpdateRequest = {
            name: this.name,
            id: this.id,
            status: updatedStatus,
            updated: isUpdate,
            tags: this.tags
        };

        if (this.tplink?.propagate) {
            this.tplinkDevice?.setRelayPower(updatedStatus).catch(error => {
                console.warn(
                    'An error occured while propagating TP-Link device update:'
                );
                console.error(error);
            });
        }

        propagateInternalDeviceUpdate(update);
    }
}
