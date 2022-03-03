import { LightingEffect } from '../src/tplink/TpLinkBulbGroup';

let hue = 0;

export const effect: LightingEffect = {
    interval: 500,
    id: 'cycle',
    name: 'Cycle',
    async run(lightingGroup, bulbs) {
        lightingGroup
            .updateLighting(
                {
                    retry: 0,
                    transitionSpeed: 500,
                    hue,
                    saturation: 100
                },
                false
            )
            .catch(() => null);

        hue += 30;
        if (hue >= 360) hue = 0;
    }
};
