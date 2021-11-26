import WebSocket from 'ws';
import { devices, DeviceUpdate, InternalDeviceUpdateRequest } from '../main';
import { parseMessage } from './parser';

let ws: WebSocket.Server;

interface WebSocketClient extends WebSocket {
    alive?: boolean;
}

export const startWebSocketServer = () => {
    const host = process.env.HOST || '0.0.0.0';
    const port = Number(process.env.PORT) || 3001;

    ws = new WebSocket.Server({ host, port });

    ws.on('connection', (client: WebSocketClient, req) => {
        client.on('message', data => onMessage(data, client));

        client.alive = true;
        client.on('pong', () => (client.alive = true));

        const deviceList = [...devices.values()].map(
            ({ id, name, status, tags }) => ({
                id,
                name,
                status,
                tags
            })
        );

        // Device List
        client.send(JSON.stringify({ deviceList }));

        const requiresStatus = deviceList.filter(
            device => device.status !== null
        );

        // Request Unknown Statuses
        client.send(
            JSON.stringify({
                requireStatus: requiresStatus.map(device => device.id)
            })
        );
    });

    console.log(`[Ready] WebSocket Server Listening on ws://${host}:${port}`);
};

const onMessage = (message: WebSocket.Data, client: WebSocket) => {
    let data;

    try {
        data = JSON.parse(message.toString());
    } catch {
        return client.send('Invalid JSON');
    }

    parseMessage(data);
};

export const propagateWebsocketUpdate = (update: DeviceUpdate) => {
    ws.clients.forEach(ws => {
        ws.send(
            JSON.stringify({
                deviceUpdate: update
            })
        );
    });
};

export const propagateWebsocketInternalUpdate = (
    update: InternalDeviceUpdateRequest
) => {
    ws.clients.forEach(ws => {
        ws.send(
            JSON.stringify({
                internalDeviceUpdateRequest: update
            })
        );
    });
};

setInterval(() => {
    ws?.clients?.forEach((client: WebSocketClient) => {
        if (!client.alive) return client.terminate();

        client.alive = false;
        client.ping();
    });
}, 10000);
