import axios from 'axios';
import { devices } from './main';

export const setScene = async (sceneName: string): Promise<boolean> => {
    switch (sceneName) {
        case 'off': {
            const computer = devices.get('computer');

            computer.requestStateUpdate(false);

            await new Promise<void>(r =>
                computer.once('update', status => status === false && r())
            );

            [...devices.values()].forEach(device =>
                device.requestStateUpdate(false)
            );

            axios
                .post('http://127.0.0.1:1729/power', {
                    power: false
                })
                .catch(error => {
                    console.warn('An error occured while turning off lights!');
                    console.error(error);
                });

            return true;
        }

        case 'on': {
            [...devices.values()].forEach(device =>
                device.requestStateUpdate(true)
            );

            axios
                .post('http://127.0.0.1:1729/white', {
                    cold: true
                })
                .catch(error => {
                    console.warn(
                        'An error occured while setting lights to white!'
                    );
                    console.error(error);
                });

            return true;
        }

        default: {
            return false;
        }
    }
};

export const toggleScene = () => {
    const shouldTurnOff = devices.get('computer').status;

    setScene(shouldTurnOff ? 'off' : 'on');
};
