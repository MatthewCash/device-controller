import { TpLinkDevice } from './TpLinkDevice';

export class TpLinkSwitch extends TpLinkDevice {
    constructor(ip: string) {
        super(ip);
    }

    async poll() {
        const res = await this.sendData({
            system: { get_sysinfo: {} }
        });

        const data = res?.system?.get_sysinfo;

        if (typeof data?.relay_state !== 'number') return null;

        return {
            power: data?.relay_state === 1
        };
    }

    public async setRelayPower(powerState: boolean) {
        return this.sendData({
            system: {
                set_relay_state: {
                    state: powerState ? 1 : 0
                }
            }
        });
    }
}
