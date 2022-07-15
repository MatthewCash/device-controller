import { devices } from '../main';

export const run = async () => {
    [...devices.values()]
        .filter(device => device.capabilities.includes('bool-switch'))
        .forEach(device => device.requestStateUpdate({ power: true }));

    devices.get('lights').requestStateUpdate({
        power: true,
        colorTemp: 9000,
        brightness: 100
    });
};
