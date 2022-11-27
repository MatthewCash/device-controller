import WebSocket from 'ws';

import { verifyWsConnection, verifyWsMessage } from '../auth';
import { devices, DeviceUpdate, DeviceUpdateRequest } from '../main';
import { parseCommands } from './parser';

let ws: WebSocket.Server<DeviceControllerSocketClient>;

interface SocketStatus {
    alive?: boolean;
    authorized?: boolean;
}

export interface DeviceControllerSocketClient extends WebSocket {
    state: SocketStatus;
    ipAddress: string;
}

export const startWebSocketServer = () => {
    const host = process.env.WS_HOST || '0.0.0.0';
    const port = Number(process.env.WS_PORT) || 8081;

    ws = new WebSocket.Server({ host, port });

    ws.on('connection', async (client, req) => {
        client.ipAddress =
            (req.headers['x-real-ip'] as string) || req.socket.remoteAddress;

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

const onAuthorized = client => {
    const deviceList = [...devices.values()].map(device => device.serialize());

    // Device List
    client.send(JSON.stringify({ commands: { deviceList } }));
};

interface InboundCommands {
    deviceUpdateRequest?: DeviceUpdateRequest;
    setScene?: string | any;
    reloadLightingEffects?: boolean;
}

interface OutboundCommands {
    deviceUpdate?: DeviceUpdate;
}

export interface InboundSocketMessage {
    commands?: InboundCommands;
    auth?: {
        authorization?: string;
    };
    connection?: {
        pong?: true;
    };
}

export interface OutboundSocketMessage {
    commands?: OutboundCommands;
    auth?: {
        authorization?: string;
    };
    state?: {
        authorized?: boolean;
    };
    connection?: {
        ping?: true;
    };
}

const onMessage = async (
    message: WebSocket.Data,
    client: DeviceControllerSocketClient
) => {
    let data: InboundSocketMessage;

    try {
        data = JSON.parse(message.toString());
    } catch {
        return client.send('Invalid JSON');
    }

    if (data.connection?.pong === true) {
        client.state.alive = true;
    }

    if (client.state?.authorized && data?.commands) {
        parseCommands(data?.commands);
    }

    if (!client.state?.authorized) {
        client.state.authorized = await verifyWsMessage(data, client).catch(
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
    ws?.clients?.forEach(client => {
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

setInterval(() => {
    ws?.clients?.forEach(client => {
        if (!client?.state?.alive) return client.close();

        client.state.alive = false;

        client.send(JSON.stringify({ connection: { ping: true } }));
        client.ping();
    });
}, 3000);
