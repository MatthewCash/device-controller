import path from 'path';

import { readDirRecursive } from './util/readDirRecursive';

const scenesDir = './src/scenes/';
const scenesFileExtension = process[Symbol.for('ts-node.register.instance')] ? '.ts' : '.js';

type SceneExecutor = () => Promise<void>;
const sceneExecutors = new Map<string, SceneExecutor>();

export const loadScenes = async (): Promise<number> => {
    const files = await readDirRecursive(scenesDir);
    const sceneFiles = files.filter(
        file => path.extname(file) === scenesFileExtension
    );

    sceneExecutors.clear();

    const loadPromises = sceneFiles.map(async file => {
        delete require.cache[require.resolve(file)];

        const sceneName = path.parse(file).name;

        const module = await import(file);
        const sceneExecutor = module.run as SceneExecutor;

        sceneExecutors.set(sceneName, sceneExecutor);
    });

    if (!loadPromises.length) {
        console.warn('No valid scenes in ' + scenesDir);
        return 0;
    }

    await Promise.all(loadPromises);

    console.log(
        `[+] ${sceneExecutors.size}/${sceneFiles.length} scenes loaded!`
    );

    return sceneExecutors.size;
};

export const setScene = (sceneName: string): boolean => !!sceneExecutors.get(sceneName)?.();

export const toggleScene = () => {
    // Turn on 5:00 - 18:00, off otherwise
    const hour = new Date().getHours();
    const shouldTurnOff = hour < 5 || hour > 18;

    setScene(shouldTurnOff ? 'off' : 'on');
};
