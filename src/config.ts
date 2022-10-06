import fs from 'fs/promises';

interface Config {
    devices: {
        name: string;
        id: string;
        controller: {
            id: string;
            config: any;
        };
        tags: string[];
        capabilities: string[];
    }[];
    tokens: string[];
}

let config = null;

export const loadConfig = async (): Promise<Config> => {
    const configFile = await fs.readFile(process.env.CONFIG_FILE_PATH || './config.json');
    config = JSON.parse(configFile.toString());
    return config;
}

export const getConfig = async (): Promise<Config> => {
    if (!config) await loadConfig();
    return config;
}