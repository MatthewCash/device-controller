import path from 'path';

import { DeviceControllerConstructor } from './DeviceController';
import { readDirRecursive } from './util/readDirRecursive';

interface DeviceControllerModule {
    id: string;
    controller: DeviceControllerConstructor;
}

const controllersDir = './controllers/';
const controllersFileExtension = '.ts';

export const deviceControllers = new Map<string, DeviceControllerConstructor>();

export const loadDeviceControllers = async (): Promise<number> => {
    const files = await readDirRecursive(controllersDir);
    const controllerFiles = files.filter(
        file => path.extname(file) === controllersFileExtension
    );

    deviceControllers.clear();

    const loadPromises = controllerFiles.map(async file => {
        delete require.cache[require.resolve(file)];

        const module = (await import(file)) as DeviceControllerModule;

        const { id, controller } = module;

        if (typeof id !== 'string' || !controller) return null;

        deviceControllers.set(id, controller);
    });

    if (!loadPromises.length) {
        console.warn('No valid controllers in ' + controllersDir);
        return 0;
    }

    await Promise.all(loadPromises);

    console.log(
        `[+] ${deviceControllers.size}/${controllerFiles.length} controllers loaded!`
    );

    return deviceControllers.size;
};
