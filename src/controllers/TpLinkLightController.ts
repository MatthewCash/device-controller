import { TypedEmitter } from 'tiny-typed-emitter';

import {
    DeviceController,
    DeviceControllerClass,
    DeviceControllerConfig,
    DeviceControllerEvents
} from '../DeviceController';
import { LightingUpdateData, LightState } from '../tplink/TpLinkBulb';
import { TpLinkBulbGroup } from '../tplink/TpLinkBulbGroup';
import { DeviceStatus } from '../Device';

interface TpLinkLightControllerConfig extends DeviceControllerConfig {
    bulbIps: string[];
}

export const controller: DeviceControllerClass = class TpLinkLightController
    extends TypedEmitter<DeviceControllerEvents>
    implements DeviceController
{
    static readonly id = 'tplink-lights';

    propagate: boolean;
    monitor: boolean;
    bulbIps: string[];

    private tplinkBulbGroup: TpLinkBulbGroup;

    private pollInverval: NodeJS.Timer;

    private lastState: any;
    private failureCount = 0;

    constructor(config: TpLinkLightControllerConfig) {
        super();

        this.propagate = config?.propagate ?? true;
        this.monitor = config?.monitor ?? true;
        this.bulbIps = config?.bulbIps ?? [];

        this.tplinkBulbGroup = new TpLinkBulbGroup(this.bulbIps);

        if (this.monitor) {
            this.pollInverval = setInterval(async () => {
                const state = await this.tplinkBulbGroup
                    .poll()
                    .catch(() => null);

                if (
                    state != null &&
                    typeof state === 'object' &&
                    this.lastState &&
                    Object.keys(state).every(
                        key =>
                            typeof state[key] === 'object' ||
                            state[key] === this.lastState[key]
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
                            `Bulbs ${this.bulbIps.join(
                                ','
                            )} are offline after ${
                                this.failureCount
                            } poll failures!`
                        );
                        this.notifyOnline(false);
                    }
                }
            }, 100);
        }
    }

    updateState(requestedState: LightingUpdateData): void {
        if (!this.propagate) return;

        this.tplinkBulbGroup.updateLighting(requestedState).catch(error => {
            console.warn(
                'An error occured while propagating TP-Link device update:'
            );
            console.error(error);
        });
    }

    private notifyState(state: LightState): void {
        if (!this.monitor) return;

        this.emit('update', state);
    }

    private notifyOnline(online: DeviceStatus['online']): void {
        if (!this.monitor) return;

        this.emit('onlineUpdate', online);
    }
};
