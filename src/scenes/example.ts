import { devices } from '../main';

export const run = async () => {
    // Turn device off
    devices.get('example-device').requestStateUpdate({ power: false });

    console.log('Scene completed!');
};
