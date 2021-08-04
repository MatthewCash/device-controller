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
    setScene: (scene?: string) => {
        if (typeof scene === 'string') {
            setScene(scene);
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
