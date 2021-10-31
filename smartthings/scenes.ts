import axios from 'axios';
import { devices } from '../main';
import config from '../config.json';

const sceneIds = {
    on: config.scenes.onSceneId,
    off: config.scenes.offSceneId
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
