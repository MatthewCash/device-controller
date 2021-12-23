import WebSocket from 'ws';
import { verifyWsConnection, veryifyWsMessage } from '../auth';
import {
    devices,
    DeviceUpdate,
    DeviceUpdateRequest,
    InternalDeviceUpdate,
    InternalDeviceUpdateRequest
} from '../main';
import { parseMessage } from './parser';

let ws: WebSocket.Server;

interface SocketStatus {
    alive?: boolean;
    authorized?: boolean;
}

interface DeviceClient extends WebSocket {
    state: SocketStatus;
}

export const startWebSocketServer = () => {
    const host = process.env.HOST || '0.0.0.0';
    const port = Number(process.env.PORT) || 3001;

    ws = new WebSocket.Server({ host, port });

    ws.on('connection', async (client: DeviceClient, req) => {
        client.state = {
            alive: true,
            authorized: await verifyWsConnection(req)
        };

        client.send(JSON.stringify({ state: client.state }));

        client.on('pong', () => (client.state.alive = true));

        client.on('message', data => onMessage(data, client));

        if (client.state?.authorized) onAuthorized(client);
    });

    console.log(`[Ready] WebSocket Server Listening on ws://${host}:${port}`);
};

const onAuthorized = (client: DeviceClient) => {
    const deviceList = [...devices.values()].map(
        ({ id, name, status, tags }) => ({
            id,
            name,
            status,
            tags
        })
    );

    // Device List
    client.send(JSON.stringify({ commands: { deviceList } }));

    const requiresStatus = deviceList.filter(device => device.status !== null);

    // Request Unknown Statuses
    client.send(
        JSON.stringify({
            commands: {
                requireStatus: requiresStatus.map(device => device.id)
            }
        })
    );
};

interface Commands {
    deviceUpdateRequest?: DeviceUpdateRequest;
    internalDeviceUpdate?: InternalDeviceUpdate;
    setScene?: string | any;
}
export interface SocketMessage {
    commands?: Commands;
    auth?: {
        authorization?: string;
    };
}

const onMessage = async (message: WebSocket.Data, client: DeviceClient) => {
    let data: SocketMessage;

    try {
        data = JSON.parse(message.toString());
    } catch {
        return client.send('Invalid JSON');
    }

    if (client.state?.authorized && data?.commands) {
        parseMessage(data?.commands);
    }

    if (!client.state?.authorized) {
        client.state.authorized = await veryifyWsMessage(data).catch(
            () => false
        );

        client.send(
            JSON.stringify({
                state: {
                    authorized: client.state?.authorized
                }
            })
        );

        if (client.state?.authorized) onAuthorized(client);
    }
};

export const propagateWebsocketUpdate = (update: DeviceUpdate) => {
    ws.clients.forEach((client: DeviceClient) => {
        if (!client.state?.authorized) return;
        client.send(
            JSON.stringify({
                commands: {
                    deviceUpdate: update
                }
            })
        );
    });
};

export const propagateWebsocketInternalUpdate = (
    update: InternalDeviceUpdateRequest
) => {
    ws.clients.forEach((client: DeviceClient) => {
        if (!client.state?.authorized) return;
        client.send(
            JSON.stringify({
                commands: {
                    internalDeviceUpdateRequest: update
                }
            })
        );
    });
};

setInterval(() => {
    ws?.clients?.forEach((client: DeviceClient) => {
        if (!client.state.alive) return client.close();

        client.state.alive = false;
        client.ping();
    });
}, 10000);
