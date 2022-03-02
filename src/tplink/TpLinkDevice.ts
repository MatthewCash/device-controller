import dgram from 'dgram';
import { EventEmitter } from 'events';

const encrypt = (buffer: Buffer | string, key = 0xab) => {
    if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
    for (let i = 0; i < buffer.length; i++) {
        const c = buffer[i];
        buffer[i] = c ^ key;
        key = buffer[i];
    }
    return buffer;
};

const decrypt = (buffer: Buffer, key = 0xab) => {
    for (let i = 0; i < buffer.length; i++) {
        const c = buffer[i];
        buffer[i] = c ^ key;
        key = c;
    }
    return buffer;
};

export declare interface TpLinkDevice {
    on(event: 'poll', listener: (status: boolean) => void);
    on(event: 'update', listener: (update: boolean) => void);
}

export class TpLinkDevice extends EventEmitter {
    readonly ip: string;
    pollInterval?: NodeJS.Timeout;
    prevPowerState: boolean;

    constructor(ip: string, shouldPoll = false) {
        super();
        this.ip = ip;

        if (shouldPoll) this.startPolling();
    }

    public static scan(broadcastAddr = '255.255.255.255') {
        const emitter = new EventEmitter();
        const client = dgram.createSocket({
            type: 'udp4',
            reuseAddr: true
        });
        client.bind(9998, undefined, () => {
            client.setBroadcast(true);
            const message = encrypt('{"system":{"get_sysinfo":{}}}');
            client.send(message, 0, message.length, 9999, broadcastAddr);
        });
        client.on('message', (msg, rinfo) => {
            const device = new TpLinkDevice(rinfo.address);

            emitter.emit('new', device);
        });
        return emitter;
    }

    private async pollStatus() {
        const status = await this.getStatus().catch(() => null);
        if (status == null) return;

        const online = status?.relay_state === 1;

        this.emit('poll', online);

        if (online !== this.prevPowerState) {
            this.emit('update', { power: online });
            this.prevPowerState = online;
        }
    }

    public startPolling() {
        this.pollInterval = setInterval(() => this.pollStatus(), 100);
    }

    public stopPolling() {
        clearInterval(this.pollInterval);
    }

    private async sendData(data): Promise<any> {
        const client = dgram.createSocket({
            type: 'udp4',
            reuseAddr: true
        });

        const message = encrypt(JSON.stringify(data));

        const decodedData = await new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    client.close();
                    reject(new Error('Request Timed Out!'));
                } catch (error) {
                    if (error?.message === 'Not running') return;
                    console.error(error);
                }
            }, 100);

            client.send(message, 0, message.length, 9999, this.ip, error => {
                if (error) {
                    client.close();
                    return reject(error);
                }
                client.once('message', message => {
                    client.close();
                    let decodedData;
                    try {
                        decodedData = JSON.parse(decrypt(message).toString());
                    } catch {
                        return reject(new Error('Could not parse payload!'));
                    }
                    resolve(decodedData);
                });
            });
        });

        return decodedData;
    }

    public async getStatus() {
        const data = await this.sendData({ system: { get_sysinfo: {} } });
        return data?.system?.get_sysinfo;
    }

    public async setRelayPower(powerState: boolean) {
        return this.sendData({
            system: {
                set_relay_state: {
                    state: powerState ? 1 : 0
                }
            }
        });
    }
}
