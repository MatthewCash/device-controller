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

export interface DeviceStatus {
    online: boolean; // Device is reachable
    state: boolean; // Controlled state
    changingTo?: boolean; // Device changing state
}

export class Device extends EventEmitter {
    name: string;
    id: string;
    loopback?: boolean;
    tplink?: TpLinkConfig;
    tplinkDevice?: TpLinkDevice;
    status: DeviceStatus;
    tags?: string[];

    constructor({ name, id, loopback, tplink, tags }: DeviceConstructor) {
        super();

        this.name = name;
        this.id = id;
        this.loopback = loopback;
        this.tplink = tplink;
        this.tags = tags;
        this.status = {
            online: false,
            state: false,
            changingTo: null
        };

        if (tplink?.ipAddress) this.loadTplinkDevice();
    }

    loadTplinkDevice() {
        this.tplinkDevice = new TpLinkDevice(
            this.tplink?.ipAddress,
            this.tplink?.monitor
        );

        this.tplinkDevice.on('update', newStatus => {
            this.updateStateInternal(newStatus);
            this.propagateUpdate(true);
        });
    }

    toggleState() {
        this.requestStateUpdate(!this.status);
    }

    // Trigger a device update from status change
    requestStateUpdate(newState: boolean) {
        const isUpdate = newState !== this.status.state;

        if (this.loopback) {
            this.updateStateInternal(newState);

            this.propagateUpdate(isUpdate);
        }

        this.propagateInternalUpdate(newState, isUpdate);
    }

    updateStateInternal(newStatus: boolean) {
        this.emit('update', newStatus);

        this.status = {
            online: true,
            state: newStatus,
            changingTo: null
        };
    }

    // Notify clients device has been updated
    propagateUpdate(isUpdate: boolean) {
        propagateDeviceUpdate({
            name: this.name,
            id: this.id,
            status: this.status,
            updated: isUpdate,
            tags: this.tags
        });
    }

    // Notify controllers device should be updated
    propagateInternalUpdate(updatedStatus: boolean, isUpdate: boolean) {
        const update: InternalDeviceUpdateRequest = {
            name: this.name,
            id: this.id,
            requestedState: updatedStatus,
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
