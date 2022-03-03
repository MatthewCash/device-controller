import { TpLinkDevice } from './TpLinkDevice';

export interface LightState {
    power: boolean;
    effect?: string;
    hue?: number;
    saturation?: number;
    brightness?: number;
    colorTemp?: number;
    mode?: 'color' | 'white' | 'effect';
}

export interface LightingUpdateData {
    colorTemp?: number | 'cold' | 'warm' | 'neutral';
    hue?: number;
    saturation?: number;
    brightness?: number;
    power?: boolean;
    transitionSpeed?: number;
    retry?: number;
}

export class TpLinkBulb extends TpLinkDevice {
    constructor(ip: string) {
        super(ip);
    }

    async poll(): Promise<LightState> {
        const res = await this.sendData({
            system: { get_sysinfo: {} }
        });

        const data = res?.system?.get_sysinfo;

        if (!data?.light_state) return null;

        const effect = null;

        return {
            power: data?.light_state?.on_off === 1,
            brightness: data?.light_state?.brightness ?? 0,
            colorTemp: data?.light_state?.color_temp ?? 0,
            hue: data?.light_state?.hue ?? 0,
            saturation: data?.light_state?.saturation ?? 0,
            mode: effect
                ? 'effect'
                : data?.light_state?.color_temp === 0
                ? 'color'
                : 'white'
        };
    }

    public async updateLighting(updateData: LightingUpdateData) {
        if (!updateData) throw new Error('No update data provided!');

        let retry = updateData.retry ?? 4;
        const transitionSpeed = updateData.transitionSpeed ?? 1000;

        let payload: any = {
            ignore_default: 1,
            transition_period: transitionSpeed
        };

        if (updateData.power != null) {
            payload.on_off = updateData.power ? 1 : 0;
        }
        if (updateData.brightness != null) {
            let brightness = updateData.brightness;

            if (brightness < 0) brightness = 0;
            if (brightness > 100) brightness = 100;

            payload.brightness = Math.round(brightness);
        }
        if (updateData.colorTemp != null) {
            let colorTemp = updateData.colorTemp;

            if (colorTemp === 'warm') colorTemp = 2700;
            if (colorTemp === 'neutral') colorTemp = 6500;
            if (colorTemp === 'cold') colorTemp = 9000;

            if (colorTemp < 2500) colorTemp = 2500;
            if (colorTemp > 9000) colorTemp = 9000;

            payload.color_temp = Math.round(colorTemp);
        }
        if (updateData.hue != null) {
            let hue = Math.round(updateData.hue);

            if (hue < 0) hue = 0;
            if (hue > 360) hue = 360;

            payload.color_temp = 0;
            payload.hue = hue;
        }
        if (updateData.saturation != null) {
            let saturation = updateData.saturation;

            if (saturation < 0) saturation = 0;
            if (saturation > 100) saturation = 100;

            payload.color_temp = 0;
            payload.saturation = Math.round(saturation);
        }

        let data;

        do {
            data = await this.sendData({
                'smartlife.iot.smartbulb.lightingservice': {
                    transition_light_state: payload
                }
            }).catch(() => null);
            if (data) break;
            retry--;
        } while (retry > 0);

        return data;
    }
}
