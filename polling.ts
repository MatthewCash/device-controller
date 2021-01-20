import ping from 'ping';
import { appId, devicePollingListener, smartapp } from './main';

devicePollingListener.on(
    'cf3c2ecd-2c62-4a74-8078-fb0a01540354',
    async device => {
        const context = await smartapp.withContext(appId);

        const { alive } = await ping.promise.probe(process.env.HOSTNAME);

        const contextDevice = await context.api.devices
            .getStatus(device.id)
            .catch(() => null);
        if (!contextDevice) return;

        const switchState =
            contextDevice?.components?.main?.switch?.switch?.value === 'on';

        if (alive) {
            device.failures = 0;
        } else if (device.failures < 5) {
            device.failures++;
        }

        if (device.failures === 0) device.online = true;

        const deviceConfig = context.config.switch.find(
            configDevice => configDevice.deviceConfig.deviceId === device.id
        );

        if (device.failures === 0 && !switchState) {
            await context.api.devices.sendCommands(
                [deviceConfig],
                'switch',
                'on'
            );
            device.online = true;
        }
        if (device.failures > 4 && switchState) {
            await context.api.devices.sendCommands(
                [deviceConfig],
                'switch',
                'off'
            );
            device.online = false;
        }
        await new Promise(r => setTimeout(r, 250));
    }
);
