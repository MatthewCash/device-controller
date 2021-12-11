import { on } from 'events';
import WebSocket from 'ws';
import { verifyWsConnection, veryifyWsMessage } from '../auth';
import { devices, DeviceUpdate, InternalDeviceUpdateRequest } from '../main';
import { parseMessage } from './parser';

let ws: WebSocket.Server;

interface DeviceClient extends WebSocket {
    alive?: boolean;
    authorized: boolean;
}

export const startWebSocketServer = () => {
    const host = process.env.HOST || '0.0.0.0';
    const port = Number(process.env.PORT) || 3001;

    ws = new WebSocket.Server({ host, port });

    ws.on('connection', async (client: DeviceClient, req) => {
        client.authorized = await verifyWsConnection(req);

        client.alive = true;
        client.on('pong', () => (client.alive = true));

        if (!client.authorized) {
            await new Promise<void>(resolve => {
                const onAuthMessage = async message => {
                    client.authorized = await veryifyWsMessage(message).catch(
                        () => false
                    );
                    if (client.authorized) {
                        resolve();
                        client.removeListener('message', onAuthMessage);

                        client.send(
                            JSON.stringify({
                                authorized: true
                            })
                        );
                    } else {
                        client.send(
                            JSON.stringify({
                                authorized: false
                            })
                        );
                    }
                };

                client.on('message', onAuthMessage);
            });
        }

        client.on('message', data => onMessage(data, client));

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

const onMessage = (message: WebSocket.Data, client: DeviceClient) => {
    if (!client.authorized) return;

    let data;

    try {
        data = JSON.parse(message.toString());
    } catch {
        return client.send('Invalid JSON');
    }

    parseMessage(data);
};

export const propagateWebsocketUpdate = (update: DeviceUpdate) => {
    ws.clients.forEach((client: DeviceClient) => {
        if (!client.authorized) return;
        client.send(
            JSON.stringify({
                deviceUpdate: update
            })
        );
    });
};

export const propagateWebsocketInternalUpdate = (
    update: InternalDeviceUpdateRequest
) => {
    ws.clients.forEach((client: DeviceClient) => {
        if (!client.authorized) return;
        client.send(
            JSON.stringify({
                internalDeviceUpdateRequest: update
            })
        );
    });
};

setInterval(() => {
    ws?.clients?.forEach((client: DeviceClient) => {
        if (!client.alive) return client.close();

        client.alive = false;
        client.ping();
    });
}, 10000);
