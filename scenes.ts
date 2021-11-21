import { devices } from './main';

export const setScene = async (sceneName: string): Promise<boolean> => {
    switch (sceneName) {
        case 'off': {
            const computer = devices.get('computer');

            computer.updateStatus(false);

            await new Promise<void>(r =>
                computer.once('update', status => status === false && r())
            );

            [...devices.values()].forEach(device => device.updateStatus(false));

            return true;
        }

        case 'on': {
            [...devices.values()].forEach(device => device.updateStatus(true));

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
