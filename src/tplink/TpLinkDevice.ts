import dgram from 'dgram';

const tplinkEncrypt = (buffer: Buffer | string, key = 0xab) => {
    if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
    for (let i = 0; i < buffer.length; i++) {
        const c = buffer[i];
        buffer[i] = c ^ key;
        key = buffer[i];
    }
    return buffer;
};

const tplinkDecrypt = (buffer: Buffer, key = 0xab) => {
    for (let i = 0; i < buffer.length; i++) {
        const c = buffer[i];
        buffer[i] = c ^ key;
        key = c;
    }
    return buffer;
};

export abstract class TpLinkDevice {
    readonly ip: string;

    private lastReceivedMessage: string;

    constructor(ip: string) {
        this.ip = ip;
    }

    abstract poll();

    protected async sendData(data) {
        return new Promise<any>((resolve, reject) => {
            const socket = dgram.createSocket({
                type: 'udp4',
                reuseAddr: true
            });

            const timeout = setTimeout(() => {
                socket.close();
                reject(new Error('Request Timed Out!'));
            }, 100);

            socket.on('message', message => {
                clearTimeout(timeout);
                socket.close();

                let data;

                try {
                    const decryptedData = tplinkDecrypt(message).toString();
                    this.lastReceivedMessage = decryptedData;

                    data = JSON.parse(decryptedData);
                } catch {
                    reject(new Error('Could not parse payload!'));
                }

                resolve(data);
            });

            socket.on('error', error => {
                clearTimeout(timeout);
                socket.close();
                reject(error);
            });

            const message = tplinkEncrypt(JSON.stringify(data));

            socket.send(message, 0, message.length, 9999, this.ip, error => {
                if (!error) return;

                socket.close();
                reject(error);
            });
        });
    }
}
