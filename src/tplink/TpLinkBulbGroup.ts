import path from 'path';

import { readDirRecursive } from '../util/readDirRecursive';
import { LightingUpdateData, LightState, TpLinkBulb } from './TpLinkBulb';

const effectsDir = './effects/';
const effectsFileExtension = '.ts';

export interface LightingEffect {
    interval: number;
    id: string;
    name: string;
    run: (
        lightingGroup: TpLinkBulbGroup,
        lights: TpLinkBulb[]
    ) => void | Promise<void>;
}

interface SerializedLightingEffect {
    interval: LightingEffect['interval'];
    id: LightingEffect['id'];
    name: LightingEffect['name'];
}

export interface LightGroupState extends LightState {
    effectId: string | null;
    effects: SerializedLightingEffect[];
}

export interface LightingGroupUpdateData extends LightingUpdateData {
    adjustBrightness?: number;
    effectId?: string | null;
}

export class TpLinkBulbGroup {
    readonly ipAddresses;

    static lightingEffects = new Map<LightingEffect['id'], LightingEffect>();
    public currentEffectId?: string;
    private lightingEffectInterval?: NodeJS.Timer;

    private tplinkBulbs: TpLinkBulb[];

    private lastLightGroupState?: LightGroupState;

    constructor(ipAddresses: string[]) {
        this.ipAddresses = ipAddresses;

        this.tplinkBulbs = ipAddresses.map(ip => new TpLinkBulb(ip));
    }

    async poll(): Promise<LightGroupState> {
        const state = (await this.tplinkBulbs[0].poll()) as LightGroupState;

        state.effectId = this.currentEffectId;
        state.effects = Array.from(
            TpLinkBulbGroup.lightingEffects.values()
        ).map(effect => ({
            interval: effect.interval,
            id: effect.id,
            name: effect.name
        }));
        if (this.currentEffectId) state.mode = 'effect';

        if (state === this.lastLightGroupState) return;

        this.lastLightGroupState = state;

        return state;
    }

    async updateLighting(
        updateData: LightingGroupUpdateData,
        disableLightingEffect = true
    ) {
        if (updateData?.adjustBrightness) {
            updateData.brightness =
                this.lastLightGroupState.brightness +
                updateData.adjustBrightness;
        }

        if (
            disableLightingEffect &&
            (updateData.colorTemp || updateData.hue || updateData.saturation)
        )
            this.disableLightingEffect();

        if (updateData?.effectId) {
            const id = updateData?.effectId;
            const effect = TpLinkBulbGroup.lightingEffects.get(id);

            if (!effect) throw new Error(`Could not find effect ${id}!`);

            this.enableLightingEffect(effect);
        }

        await Promise.all(
            this.tplinkBulbs.map(bulb => bulb.updateLighting(updateData))
        );
    }

    enableLightingEffect(effect: LightingEffect) {
        this.disableLightingEffect();

        this.currentEffectId = effect.id;
        this.lightingEffectInterval = setInterval(
            () => effect.run(this, this.tplinkBulbs),
            effect.interval
        );
    }

    disableLightingEffect = () => {
        clearInterval(this.lightingEffectInterval);
        this.currentEffectId = null;
    };

    static loadLightingEffects = async (): Promise<number> => {
        const files = await readDirRecursive(effectsDir);
        const effectFiles = files.filter(
            file => path.extname(file) === effectsFileExtension
        );

        TpLinkBulbGroup.lightingEffects.clear();

        const loadPromises = effectFiles.map(async file => {
            delete require.cache[require.resolve(file)];

            const effect = (await import(file)).effect as LightingEffect;
            const id = path.basename(file, effectsFileExtension);

            TpLinkBulbGroup.lightingEffects.set(id, effect);
        });

        if (!loadPromises.length) {
            console.warn('No valid effects in ' + effectsDir);
            return 0;
        }

        await Promise.all(loadPromises);

        console.log(
            `[+] ${TpLinkBulbGroup.lightingEffects.size}/${effectFiles.length} effects loaded!`
        );

        return TpLinkBulbGroup.lightingEffects.size;
    };
}
