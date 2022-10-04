import { LightingEffect } from '../tplink/TpLinkBulbGroup';

export const effect: LightingEffect = {
    interval: 10,
    id: 'strobe',
    name: 'Strobe',
    async run(lightingGroup, bulbs) {
        const randomHue = Math.floor(Math.random() * 360);

        lightingGroup
            .updateLighting(
                {
                    retry: 0,
                    transitionSpeed: 0,
                    hue: randomHue,
                    saturation: 100
                },
                false
            )
            .catch(() => null);
    }
};
