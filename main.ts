import express from 'express';
import { connectDatabase } from './database/connection';
import { devices, setDevice, setScene, smartapp } from './devices';

const app = express();
app.use(express.json());

app.post('/', (req, res) => {
    smartapp.handleHttpCallback(req, res);
});

app.post('/control', (req, res) => {
    const data = req.body;
    if (!data) return res.send('Invalid Body!');

    if (typeof data.devices === 'object') {
        for (const deviceId in data.device) {
            const power = data.device[deviceId];
            setDevice(deviceId, power);
        }
    }

    if (data.scene != null) {
        if (data.scene === 'toggle') {
            // Toggle is based on status of computer
            const computerDeviceId = 'cf3c2ecd-2c62-4a74-8078-fb0a01540354';
            const online = devices.find(
                device => device.id === computerDeviceId
            ).online;

            setScene(!online);
        } else {
            setScene(data.scene);
        }
    }
});

app.get('/', (req, res) => {
    res.status(400).send(
        'This is an API endpoint. No usable web interface lives here.'
    );
});

const main = () => {
    const port = Number(process.env.PORT ?? 3000);
    const host = process.env.HOST ?? '0.0.0.0';

    app.listen(port, host);

    connectDatabase();

    console.log(`[Ready] Listening on http://${host}:${port}`);
};

main();
