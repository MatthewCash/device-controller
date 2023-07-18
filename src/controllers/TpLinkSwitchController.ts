import { TypedEmitter } from 'tiny-typed-emitter';
import { DeviceStatus } from '../Device';

import {
    DeviceController,
    DeviceControllerClass,
    DeviceControllerConfig,
    DeviceControllerEvents
} from '../DeviceController';
import { TpLinkSwitch } from '../tplink/TpLinkSwitch';

interface TpLinkSwitchControllerConfig extends DeviceControllerConfig {
    ipAddress: string;
}

export const controller: DeviceControllerClass = class TpLinkSwitchController
    extends TypedEmitter<DeviceControllerEvents>
    implements DeviceController
{
    static readonly id = 'tplink-switch';

    ipAddress: string;
    propagate: boolean;
    monitor: boolean;

    private tplinkSwitch: TpLinkSwitch;
    private pollInterval: NodeJS.Timer;

    private lastState: any;
    private failureCount = 0;

    constructor(config: TpLinkSwitchControllerConfig) {
        super();

        this.ipAddress = config?.ipAddress;

        this.propagate = config?.propagate ?? true;
        this.monitor = config?.monitor ?? true;

        this.tplinkSwitch = new TpLinkSwitch(this.ipAddress);

        if (this.monitor) {
            this.pollInterval = setInterval(async () => {
                const state = await this.tplinkSwitch.poll().catch(() => null);

                if (
                    state != null &&
                    typeof state === 'object' &&
                    this.lastState &&
                    Object.keys(state).every(
                        key => state[key] === this.lastState[key]
                    )
                )
                    return;

                this.lastState = state;

                if (state != null) {
                    this.failureCount = 0;
                    this.notifyState(state);
                } else {
                    this.failureCount++;

                    if (this.failureCount === 50) {
                        console.warn(
                            `Switch ${this.ipAddress} is offline after ${this.failureCount} poll failures!`
                        );
                        this.notifyOnline(false);
                    }
                }
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

    private notifyOnline(online: DeviceStatus['online']): void {
        if (!this.monitor) return;

        this.emit('onlineUpdate', online);
    }
};
