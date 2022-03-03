import { DeviceUpdateRequest, updateDevice } from '../main';
import { setScene, toggleScene } from '../scenes';
import { TpLinkBulbGroup } from '../tplink/TpLinkBulbGroup';
import { InboundSocketMessage } from './ws';

interface CommandHandlers {
    [key: string]: (data, message) => void;
}

const commandHandlers: CommandHandlers = {
    deviceUpdateRequest: (update: DeviceUpdateRequest) => {
        updateDevice(update);
    },
    setScene: async (scene?: string) => {
        if (typeof scene === 'string') {
            const success = await setScene(scene);
            // TODO: Send error message if success is false
        } else {
            toggleScene();
        }
    },
    reloadLightingEffects: () => {
        TpLinkBulbGroup.loadLightingEffects();
    }
};

export const parseCommands = (commands: InboundSocketMessage['commands']) => {
    Object.keys(commands).forEach(key => {
        commandHandlers[key]?.(commands[key], commands);
    });
};
