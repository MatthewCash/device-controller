import { setTimeout } from 'timers/promises';
import { devices } from '../main';

export const run = async () => {
    const computer = devices.get('computer');

    devices.get('lights').requestStateUpdate({
        effectId: null,
        power: false,
        colorTemp: 'warm',
        transitionSpeed: 10000
    });

    if (computer?.status.state?.power) {
        computer.requestStateUpdate({ power: false });

        await Promise.race([
            new Promise<void>(r =>
                computer.once('update', update => {
                    if (!update.status.state?.power) r();
                })
            ),
            setTimeout(60000)
        ]);
    }

    [...devices.values()]
        .filter(device => device.capabilities.includes('bool-switch'))
        .forEach(device => device.requestStateUpdate({ power: false }));
};
