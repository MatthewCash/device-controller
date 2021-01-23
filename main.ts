import express from 'express';
import { connectDatabase } from './database/connection';
import { setDevice, setScene, smartapp, toggleScene } from './devices';
import { startWebSocketServer } from './webSocket';

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
            toggleScene();
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

    startWebSocketServer();

    console.log(`[Ready] Listening on http://${host}:${port}`);
};

main();
