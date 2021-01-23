import WebSocket from 'ws';
import { devices, setDevice, setScene, toggleScene } from './devices';

let ws: WebSocket.Server;

interface WebSocketClient extends WebSocket {
    alive: boolean;
}

export const startWebSocketServer = () => {
    ws = new WebSocket.Server({ port: 3001 });

    ws.on('connection', (client: WebSocketClient) => {
        client.send(JSON.stringify({ devices }));

        client.alive = true;
        client.on('message', onMessage);
        client.on('pong', () => (client.alive = true));
    });
};

const onMessage = async (message: string) => {
    let data;
    try {
        data = JSON.parse(message);
    } catch {
        return 'ERROR: Invalid JSON!';
    }

    if (typeof data.devices === 'object') {
        for (const deviceId in data.devices) {
            const power = data.devices[deviceId];
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
};

export const sendToClients = (data: string | any) => {
    if (typeof data === 'string') {
        ws.clients.forEach(client => client.send(data));
    } else {
        const jsonString = JSON.stringify(data);
        ws.clients.forEach(client => client.send(jsonString));
    }
};

export const sendDevices = () => {
    sendToClients({ devices });
};

export const sendDeviceUpdate = (deviceId: string, status: boolean) => {
    sendToClients({
        deviceUpdate: {
            id: deviceId,
            status
        }
    });
};

setInterval(() => {
    ws.clients.forEach((client: WebSocketClient) => {
        if (!client.alive) return client.terminate();

        client.alive = false;
        client.ping();
    });
}, 10000);
