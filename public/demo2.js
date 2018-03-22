
// Concat two ArrayBuffers
const concat = (buffer1, buffer2) => {
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);

    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);

    return tmp.buffer;
};

// Write a proper WAVE header for the given buffer.
const wavify = (data, numberOfChannels, sampleRate) => {
    const header = new ArrayBuffer(44);

    var d = new DataView(header);

    d.setUint8(0, "R".charCodeAt(0));
    d.setUint8(1, "I".charCodeAt(0));
    d.setUint8(2, "F".charCodeAt(0));
    d.setUint8(3, "F".charCodeAt(0));

    d.setUint32(4, data.byteLength / 2 + 44, true);

    d.setUint8(8, "W".charCodeAt(0));
    d.setUint8(9, "A".charCodeAt(0));
    d.setUint8(10, "V".charCodeAt(0));
    d.setUint8(11, "E".charCodeAt(0));
    d.setUint8(12, "f".charCodeAt(0));
    d.setUint8(13, "m".charCodeAt(0));
    d.setUint8(14, "t".charCodeAt(0));
    d.setUint8(15, " ".charCodeAt(0));

    d.setUint32(16, 16, true);
    d.setUint16(20, 1, true);
    d.setUint16(22, numberOfChannels, true);
    d.setUint32(24, sampleRate, true);
    d.setUint32(28, sampleRate * 1 * 2);
    d.setUint16(32, numberOfChannels * 2);
    d.setUint16(34, 16, true);

    d.setUint8(36, "d".charCodeAt(0));
    d.setUint8(37, "a".charCodeAt(0));
    d.setUint8(38, "t".charCodeAt(0));
    d.setUint8(39, "a".charCodeAt(0));
    d.setUint32(40, data.byteLength, true);

    return concat(header, data);
};

const pad = buffer => {
    const currentSample = new Float32Array(1);

    buffer.copyFromChannel(currentSample, 0, 0);

    let wasPositive = currentSample[0] > 0;

    for (let i = 0; i < buffer.length; i += 1) {
        buffer.copyFromChannel(currentSample, 0, i);

        if (wasPositive && currentSample[0] < 0 || !wasPositive && currentSample[0] > 0) {
            break;
        }

        currentSample[0] = 0;
        buffer.copyToChannel(currentSample, 0, i);
    }

    buffer.copyFromChannel(currentSample, 0, buffer.length - 1);

    wasPositive = currentSample[0] > 0;

    for (let i = buffer.length - 1; i > 0; i -= 1) {
        buffer.copyFromChannel(currentSample, 0, i);

        if (wasPositive && currentSample[0] < 0 || !wasPositive && currentSample[0] > 0) {
            break;
        }

        currentSample[0] = 0;
        buffer.copyToChannel(currentSample, 0, i);
    }

    return buffer;
};

class PlayerUI {
    constructor(canvas, analyser) {
        this.isPlaying = false;
        this.analyser = analyser;
        this.SIZE = 64;
        this.loaded = this.fileSize = 0;
        this.context = canvas.getContext('2d');
        this.WIDTH = canvas.width;
        this.HEIGHT = canvas.height;
        this.blockWidth = Math.round(this.WIDTH / this.SIZE);
        this.lineWidth = this.blockWidth - Math.round(this.blockWidth * 0.3);
        this.freqByteData = new Uint8Array(this.analyser.frequencyBinCount);
    }

    play() {
        if (this.isPlaying === false) {
            this.isPlaying = true;
            this.updatePlayheadUi();
        }
    }

    stop() {
        this.isPlaying = false;
    }

    updatePlayheadUi() {
        this.analyser.getByteFrequencyData(this.freqByteData);
        let arr = [];
        const block = Math.ceil(this.freqByteData.length / this.SIZE);
        for (let i = 0; i < this.SIZE; i++) {
            let sum = 0;
            for (let j = i * block; j < (i + 1) * block && j < this.freqByteData.length; j++) {
                sum += this.freqByteData[j];
            }
            arr.push(Math.ceil(sum / block));
        }

        if (this.drawVisualizer(arr) !== 0 || this.isPlaying) {
            requestAnimationFrame(this.updatePlayheadUi.bind(this));
        }
    }

    drawVisualizer(arr) {
        this.context.clearRect(0, 0, this.WIDTH, this.HEIGHT);
        this.context.font = "20px Georgia";
        if (this.loaded && this.fileSize) {
            if (this.loaded < this.fileSize) {
                this.context.fillText(`Loading...${Math.ceil(this.loaded / this.fileSize * 100)}%`, 10, 50);
            } else {
                this.context.fillText(`Done`, 10, 50);
            }
        }
        let sumHeight = 0;
        for (var i = 0; i < this.SIZE; i++) {
            let lineHeight = arr[i] / 280 * this.HEIGHT;
            sumHeight += lineHeight;
            this.context.fillStyle = 'green';
            this.context.fillRect(this.blockWidth * i, this.HEIGHT - lineHeight, this.lineWidth, lineHeight);
        }
        return sumHeight;
    }
}

class WavPlayer {
    constructor(canvas) {
        this.nextTime = this.numberOfChannels = this.sampleRate = 0;
        this.header = this.scheduleBuffersTimeoutId = null;
        this.stack = [];
        this.hasCanceled = false;
        this.isFirst = true;
        this.context = new AudioContext();
        this.reader = null;
        this.analyser = this.context.createAnalyser();
        this.freqByteData = new Uint8Array(this.analyser.frequencyBinCount);
        this.ui = new PlayerUI(canvas, this.analyser);
    }

    scheduleBuffers() {
        if (this.hasCanceled) {
            this.scheduleBuffersTimeoutId = null;
            return;
        }
        while (this.stack.length > 0 && this.stack[0].buffer !== undefined && this.nextTime < this.context.currentTime + 2) {

            const currentTime = this.context.currentTime;

            const source = this.context.createBufferSource();

            const segment = this.stack.shift();

            source.buffer = pad(segment.buffer);
            source.connect(this.context.destination);
            source.connect(this.analyser);
            this.ui.play();

            if (this.nextTime == 0) {
                this.nextTime = currentTime + 0.2; /// add 700ms latency to work well across systems - tune this if you like
            }

            let duration = source.buffer.duration;
            let offset = 0;

            if (currentTime > this.nextTime) {
                offset = currentTime - this.nextTime;
                this.nextTime = currentTime;
                duration = duration - offset;
            }

            source.start(this.nextTime, offset);
            source.stop(this.nextTime + duration);

            this.nextTime += duration; // Make the next buffer wait the length of the last buffer before being played
        }

        this.scheduleBuffersTimeoutId = setTimeout(() => this.scheduleBuffers(), 500);
    }

    async read() {
        if (!this.reader) return;
        const { value, done } = await this.reader.read();
        if (this.hasCanceled) {
            this.reader.cancel();
            this.isFirst = true;
            return;
        }

        if (value && value.buffer) {
            let buffer;
            let segment = {};

            if (this.header) {
                buffer = concat(this.header, value.buffer);
            } else {
                buffer = value.buffer;
            }

            if (this.isFirst && buffer.byteLength <= 44) {
                this.header = buffer;
                await this.read();
                return;
            }

            if (this.isFirst) {
                this.isFirst = false;
                const dataView = new DataView(buffer);
                this.numberOfChannels = dataView.getUint16(22, true);
                this.sampleRate = dataView.getUint32(24, true);
                this.ui.fileSize = dataView.getUint32(4, true) - 44;
                buffer = buffer.slice(44);
            }

            if (buffer.byteLength % 2 !== 0) {
                this.header = buffer.slice(-2, -1);
                buffer = buffer.slice(0, -1);
            } else {
                this.header = null;
            }

            segment.buffer = await this.context.decodeAudioData(wavify(buffer, this.numberOfChannels, this.sampleRate));
            this.ui.loaded += buffer.byteLength;
            this.stack.push(segment);
            if (this.scheduleBuffersTimeoutId === null) {
                this.scheduleBuffers();
            }
        }

        if (done) {
            return;
        }

        // continue reading
        await this.read();
    }

    async play(url) {
        this.nextTime = 0;
        this.hasCanceled = false;
        this.ui.hasCanceled = false;
        this.ui.loaded = this.ui.fileSize = 0;
        try {
            const response = await fetch(url);
            this.reader = response.body.getReader();
            await this.read();
        } catch (e) {
            console.log(e);
        }
    }

    stop() {
        this.hasCanceled = true;
        this.ui.stop();
    }

}

document.addEventListener('DOMContentLoaded', () => {
    const player = new WavPlayer(document.getElementById('canvas'));
    document.getElementById('play').addEventListener('click', () => player.play('http://www.corsak.net/wzry.wav'));
    document.getElementById('stop').addEventListener('click', () => player.stop());
});