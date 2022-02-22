import { TypedEmitter } from 'tiny-typed-emitter';
import { Device, DeviceStatus } from './Device';

interface DeviceControllerConfig {
    propagate?: boolean;
    monitor?: boolean;
    [key: string]: any;
}

export type DeviceControllerConstructor = new (
    config: DeviceControllerConfig
) => DeviceController;

export interface DeviceControllerEvents {
    update: (state: boolean) => void;
}

export abstract class DeviceController extends TypedEmitter<DeviceControllerEvents> {
    propagate: boolean;
    monitor: boolean;

    abstract updateState(state: DeviceStatus['state'], device: Device): void;
}
