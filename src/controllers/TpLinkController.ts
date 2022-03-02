import { TypedEmitter } from 'tiny-typed-emitter';
import { DeviceStatus } from '../Device';

import {
    DeviceController,
    DeviceControllerClass,
    DeviceControllerEvents
} from '../DeviceController';
import { TpLinkDevice } from '../tplink/TpLinkDevice';

interface TpLinkControllerConfig {
    ipAddress: string;
    propagate?: boolean;
    monitor?: boolean;
}

export const controller: DeviceControllerClass = class TpLinkController
    extends TypedEmitter<DeviceControllerEvents>
    implements DeviceController
{
    static readonly id = 'tplink';

    ipAddress: string;
    propagate: boolean;
    monitor: boolean;

    private tplinkDevice: TpLinkDevice;

    constructor(config: TpLinkControllerConfig) {
        super();

        this.ipAddress = config?.ipAddress;

        this.propagate = config?.propagate ?? true;
        this.monitor = config?.monitor ?? true;

        this.tplinkDevice = new TpLinkDevice(this.ipAddress, this.monitor);

        if (this.monitor) {
            this.tplinkDevice.on('update', this.notifyState.bind(this));
        }
    }

    updateState(state: DeviceStatus['state']): void {
        if (!this.propagate) return;

        if (state?.power == null) return;

        this.tplinkDevice.setRelayPower(state.power).catch(error => {
            console.warn(
                'An error occured while propagating TP-Link device update:'
            );
            console.error(error);
        });
    }

    private notifyState(state: DeviceStatus['state']): void {
        if (!this.monitor) return;

        this.emit('update', state);
    }
};
