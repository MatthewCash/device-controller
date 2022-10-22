import WebSocket from 'ws';
import { verifyWsConnection, veryifyWsMessage } from '../auth';
import { devices, DeviceUpdate, DeviceUpdateRequest } from '../main';
import { parseCommands } from './parser';

let ws: WebSocket.Server;

interface SocketStatus {
    alive?: boolean;
    authorized?: boolean;
}

interface DeviceClient extends WebSocket {
    state: SocketStatus;
}

export const startWebSocketServer = () => {
    const host = process.env.WS_HOST || '0.0.0.0';
    const port = Number(process.env.WS_PORT) || 8081;

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

const onMessage = async (message: WebSocket.Data, client: DeviceClient) => {
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
    (ws.clients as unknown as DeviceClient[]).forEach(client => {
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
    (ws?.clients as unknown as DeviceClient[])?.forEach(client => {
        if (!client?.state?.alive) return client.close();

        client.state.alive = false;

        client.send(JSON.stringify({ connection: { ping: true } }));
        client.ping();
    });
}, 3000);
