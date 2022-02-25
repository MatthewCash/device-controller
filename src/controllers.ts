import path from 'path';

import { DeviceControllerClass } from './DeviceController';
import { readDirRecursive } from './util/readDirRecursive';

const controllersDir = './src/controllers/';
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
        const controllerClass = module.controller as DeviceControllerClass;

        const { id } = controllerClass;

        if (typeof id !== 'string' || !controllerClass) return null;

        deviceControllers.set(id, controllerClass);
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
