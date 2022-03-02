import { setTimeout } from 'timers/promises';
import axios from 'axios';
import { devices } from './main';

export const setScene = async (sceneName: string): Promise<boolean> => {
    switch (sceneName) {
        case 'off': {
            const computer = devices.get('computer');

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

            return true;
        }

        case 'on': {
            [...devices.values()]
                .filter(device => device.capabilities.includes('bool-switch'))
                .forEach(device => device.requestStateUpdate({ power: true }));

            axios
                .post('http://127.0.0.1:1729/update', {
                    update: {
                        power: true,
                        colorTemp: 9000,
                        brightness: 100
                    }
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
    // Turn on 5:00 - 18:00, off otherwise
    const hour = new Date().getHours();
    const shouldTurnOff = hour < 5 || hour > 18;

    setScene(shouldTurnOff ? 'off' : 'on');
};
