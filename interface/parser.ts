import {
    DeviceUpdateRequest,
    InternalDeviceUpdate,
    updateDevice,
    updateDeviceInternal
} from '../main';
import { setScene, toggleScene } from '../smartthings/scenes';

interface MessageHandlers {
    [key: string]: (data, message) => void;
}

const messageHandlers: MessageHandlers = {
    deviceUpdateRequest: (update: DeviceUpdateRequest) => {
        updateDevice(update);
    },
    internalDeviceUpdate: (update: InternalDeviceUpdate) => {
        updateDeviceInternal(update);
    },
    setScene: async (scene?: string) => {
        if (typeof scene === 'string') {
            const success = await setScene(scene);
            // TODO: Send error message if success is false
        } else {
            toggleScene();
        }
    }
};

export const parseMessage = message => {
    Object.keys(message).forEach(key => {
        messageHandlers[key]?.(message[key], message);
    });
};
