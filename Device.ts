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
}

export declare interface Device {
    on(
        event: 'update',
        listener: (update: InternalDeviceUpdateRequest) => void
    ): this;
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

    constructor({ name, id, loopback, tplink }: DeviceConstructor) {
        super();

        this.name = name;
        this.id = id;
        this.loopback = loopback;
        this.tplink = tplink;

        if (tplink?.ipAddress) this.loadTplinkDevice();
    }

    loadTplinkDevice() {
        this.tplinkDevice = new TpLinkDevice(this.tplink.ipAddress);
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
