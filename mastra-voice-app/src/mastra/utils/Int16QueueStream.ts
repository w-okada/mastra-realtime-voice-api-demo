import { Readable } from "stream";

export class Int16QueueStream extends Readable {
    private queue: Int16Array[] = [];
    private waiting = false;

    constructor() {
        super();
    }

    pushInt16(int16: Int16Array) {
        this.queue.push(int16);
        if (this.waiting) {
            this.waiting = false;
            this._read();
        }
    }

    _read() {
        if (this.queue.length === 0) {
            this.waiting = true;
            return;
        }
        const int16 = this.queue.shift()!;
        const buffer = Buffer.from(int16.buffer, int16.byteOffset, int16.byteLength);
        this.push(buffer);
    }
}
