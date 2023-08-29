import { setTimeout } from 'timers/promises';
import { DeviceUpdate, devices } from '../main';

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

        let updateCallback: (update: DeviceUpdate) => void;
        await Promise.race([
            new Promise<void>(r => {
                updateCallback = update => {
                    if (update.status.state?.power === false) r();
                };
                computer.on('update', updateCallback);
            }),
            setTimeout(60000)
        ]);
        computer.removeListener('update', updateCallback);
    }

    Array.from(devices.values())
        .filter(device => device.capabilities.includes('bool-switch'))
        .forEach(device => {
            console.log(`setting ${device.id} to off`);
            device.requestStateUpdate({ power: false });
        });
};
