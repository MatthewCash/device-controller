import { LightingEffect } from '../tplink/TpLinkBulbGroup';

let evenRed = false;

export const effect: LightingEffect = {
    interval: 500,
    id: 'flash',
    name: 'Flash',
    async run(lightingGroup, bulbs) {
        bulbs.forEach((bulb, index) => {
            const even = index % 2 === 0;
            const red = (evenRed && even) || (!evenRed && !even);

            bulb.updateLighting({
                retry: 0,
                hue: red ? 0 : 240,
                saturation: 100,
                transitionSpeed: red ? 400 : 0
            }).catch(() => null);
        });

        evenRed = !evenRed;
    }
};
