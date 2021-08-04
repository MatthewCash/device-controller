import axios from 'axios';
import { devices } from '../main';

const sceneIds = {
    on: '9e7a8603-2cd6-483c-b29f-86b7383430a2',
    off: 'e07f550d-1976-4952-b997-88a6713ff2a5'
};

export const setScene = async (sceneName: string) => {
    const sceneId = sceneIds[sceneName];

    switch (sceneName) {
        case 'off': {
            [...devices.values()].forEach(device => device.updateStatus(false));

            const computer = devices.get('computer');

            await new Promise<void>(r =>
                computer.once('update', status => status === false && r())
            );

            axios(`https://api.smartthings.com/v1/scenes/${sceneId}/execute`, {
                method: 'POST',
                headers: {
                    Authorization:
                        'Bearer ' + process.env.SMARTTHINGS_SCENE_TOKEN
                }
            });
            break;
        }

        case 'on': {
            [...devices.values()].forEach(device => device.updateStatus(true));

            axios(`https://api.smartthings.com/v1/scenes/${sceneId}/execute`, {
                method: 'POST',
                headers: {
                    Authorization:
                        'Bearer ' + process.env.SMARTTHINGS_SCENE_TOKEN
                }
            });

            break;
        }

        default: {
            axios(`https://api.smartthings.com/v1/scenes/${sceneId}/execute`, {
                method: 'POST',
                headers: {
                    Authorization:
                        'Bearer ' + process.env.SMARTTHINGS_SCENE_TOKEN
                }
            });
        }
    }
};

export const toggleScene = () => {
    const sot = devices.get('computer').status;

    setScene(sot ? 'off' : 'on');
};
