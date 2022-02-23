import path from 'path';

import { DeviceControllerClass } from './DeviceController';
import { readDirRecursive } from './util/readDirRecursive';

const controllersDir = './controllers/';
const controllersFileExtension = '.ts';

export const deviceControllers = new Map<string, DeviceControllerClass>();

export const loadDeviceControllers = async (): Promise<number> => {
    const files = await readDirRecursive(controllersDir);
    const controllerFiles = files.filter(
        file => path.extname(file) === controllersFileExtension
    );

    deviceControllers.clear();

    const loadPromises = controllerFiles.map(async file => {
        delete require.cache[require.resolve(file)];

        const module = await import(file);
        const controllerConstructor =
            module.controller as DeviceControllerClass;

        const { id } = controllerConstructor;

        if (typeof id !== 'string' || !controllerConstructor) return null;

        deviceControllers.set(id, controllerConstructor);
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
