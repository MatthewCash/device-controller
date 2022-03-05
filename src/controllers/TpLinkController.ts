import { TypedEmitter } from 'tiny-typed-emitter';
import { DeviceStatus } from '../Device';

import {
    DeviceController,
    DeviceControllerClass,
    DeviceControllerConfig,
    DeviceControllerEvents
} from '../DeviceController';
import { TpLinkSwitch } from '../tplink/TpLinkSwitch';

interface TpLinkControllerConfig extends DeviceControllerConfig {
    ipAddress: string;
}

export const controller: DeviceControllerClass = class TpLinkController
    extends TypedEmitter<DeviceControllerEvents>
    implements DeviceController
{
    static readonly id = 'tplink';

    ipAddress: string;
    propagate: boolean;
    monitor: boolean;

    private tplinkSwitch: TpLinkSwitch;
    private pollInterval: NodeJS.Timer;

    private lastState: any;

    constructor(config: TpLinkControllerConfig) {
        super();

        this.ipAddress = config?.ipAddress;

        this.propagate = config?.propagate ?? true;
        this.monitor = config?.monitor ?? true;

        this.tplinkSwitch = new TpLinkSwitch(this.ipAddress);

        if (this.monitor) {
            this.pollInterval = setInterval(async () => {
                const state = await this.tplinkSwitch.poll().catch(() => null);
                if (!state) return;

                if (
                    this.lastState &&
                    Object.keys(state).every(
                        key => state[key] === this.lastState[key]
                    )
                )
                    return;

                this.lastState = state;

                this.notifyState(state);
            }, 100);
        }
    }

    updateState(state: DeviceStatus['state']): void {
        if (!this.propagate) return;

        if (state?.power == null) return;

        this.tplinkSwitch.setRelayPower(state.power).catch(error => {
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
