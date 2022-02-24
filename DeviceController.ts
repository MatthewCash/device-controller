import { TypedEmitter } from 'tiny-typed-emitter';
import { Device, DeviceStatus } from './Device';

export interface DeviceControllerConfig {
    propagate?: boolean;
    monitor?: boolean;
    [key: string]: any;
}

export interface DeviceControllerClass {
    readonly id: string;
    new (config: DeviceControllerConfig): DeviceController;
}

export interface DeviceControllerEvents {
    update: (state: DeviceStatus['state']) => void;
}

export abstract class DeviceController extends TypedEmitter<DeviceControllerEvents> {
    propagate: boolean;
    monitor: boolean;

    abstract updateState(state: DeviceStatus['state'], device: Device): void;
}
