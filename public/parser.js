// my event handler
function event(all) {
    all = all || Object.create(null);

    return {
        on(type, handler) {
            (all[type] || (all[type] = [])).push(handler);
        },
        off(type, handler) {
            if (all[type]) {
                all[type].splice(all[type].indexOf(handler) >>> 0, 1);
            }
        },
        emit(type, evt) {
            (all[type] || []).slice().map(handler => {
                handler(evt);
            });
            (all['*'] || []).slice().map(handler => {
                handler(type, evt);
            });
        }
    };
}

// Named constants with unique integer values
const C = {};
// Tokenizer States
const START = C.START = 0x11;
const TRUE1 = C.TRUE1 = 0x21;
const TRUE2 = C.TRUE2 = 0x22;
const TRUE3 = C.TRUE3 = 0x23;
const FALSE1 = C.FALSE1 = 0x31;
const FALSE2 = C.FALSE2 = 0x32;
const FALSE3 = C.FALSE3 = 0x33;
const FALSE4 = C.FALSE4 = 0x34;
const NULL1 = C.NULL1 = 0x41;
const NULL2 = C.NULL3 = 0x42;
const NULL3 = C.NULL2 = 0x43;
const NUMBER1 = C.NUMBER1 = 0x51;
const NUMBER2 = C.NUMBER2 = 0x52;
const NUMBER3 = C.NUMBER3 = 0x53;
const NUMBER4 = C.NUMBER4 = 0x54;
const NUMBER5 = C.NUMBER5 = 0x55;
const NUMBER6 = C.NUMBER6 = 0x56;
const NUMBER7 = C.NUMBER7 = 0x57;
const NUMBER8 = C.NUMBER8 = 0x58;
const STRING1 = C.STRING1 = 0x61;
const STRING2 = C.STRING2 = 0x62;
const STRING3 = C.STRING3 = 0x63;
const STRING4 = C.STRING4 = 0x64;
const STRING5 = C.STRING5 = 0x65;
const STRING6 = C.STRING6 = 0x66;

function toknam(code) {
    let keys = Object.keys(C);
    for (let i = 0, l = keys.length; i < l; i++) {
        let key = keys[i];
        if (C[key] === code) {
            return key;
        }
    }
    return code && "0x" + code.toString(16);
}

class StreamJSONPaser {

    constructor() {
        this.state = START;

        // for string parsing
        this.string = undefined;
        this.unicode = undefined;

        // For number parsing
        this.negative = undefined;
        this.magnatude = undefined;
        this.position = undefined;
        this.exponent = undefined;
        this.negativeExponent = undefined;
        const emit = event();
        this.on = emit.on;
        this.off = emit.off;
        this.emit = emit.emit;
    }

    async read() {
        const { value, done } = await this.reader.read();

        this._parse(value);

        if (done) return;

        await this.read();
    }

    charError(buffer, i) {
        console.error("Unexpected " + JSON.stringify(String.fromCharCode(buffer[i])) + " at position " + i + " in state " + toknam(this.state));
    }

    cancel() {
        if (this.reader) {
            this.reader.cancel();
        }
    }

    _parse(buffer) {
        if (!buffer) return;
        let n;
        for (let i = 0; i < buffer.length; i++) {
            switch (this.state) {
                case START:
                    n = buffer[i];
                    switch (n) {
                        case 0x7b:
                            // `{`
                            this.emit('startObject');
                            continue;
                        case 0x7d:
                            // `}`
                            this.emit('onEndObject');
                            continue;
                        case 0x5b:
                            // `[`
                            this.emit('onStartArray');
                            continue;
                        case 0x5d:
                            // `]`
                            this.emit('onEndArray');
                            continue;
                        case 0x3a:
                            // `:`
                            this.emit('onColon');
                            continue;
                        case 0x2c:
                            // `,`
                            this.emit('onComma');
                            continue;
                        case 0x74:
                            // `t`
                            this.state = TRUE1;
                            continue;
                        case 0x66:
                            // `f`
                            this.state = FALSE1;
                            continue;
                        case 0x6e:
                            // `n`
                            this.state = NULL1;
                            continue;
                        case 0x22:
                            // `"`
                            this.string = "";
                            this.state = STRING1;
                            continue;
                        case 0x2d:
                            // `-`
                            this.negative = true;
                            this.state = NUMBER1;
                            continue;
                        case 0x30:
                            // `0`
                            this.magnatude = 0;
                            this.state = NUMBER2;
                            continue;
                    }
                    if (n > 0x30 && n < 0x40) {
                        // 1-9
                        this.magnatude = n - 0x30;
                        this.state = NUMBER3;
                        continue;
                    }
                    if (n === 0x20 || n === 0x09 || n === 0x0a || n === 0x0d) {
                        continue; // whitespace
                    }
                    this.charError(buffer, i);
                case STRING1:
                    // After open quote
                    n = buffer[i];
                    switch (n) {
                        case 0x22:
                            // `"`
                            this.emit('String', this.string);
                            this.string = undefined;
                            this.state = START;
                            continue;
                        case 0x5c:
                            // `\`
                            this.state = STRING2;
                            continue;
                    }
                    if (n >= 0x20) {
                        this.string += String.fromCharCode(n);
                        continue;
                    }
                    this.charError(buffer, i);
                case STRING2:
                    // After backslash
                    n = buffer[i];
                    switch (n) {
                        case 0x22:
                            this.string += "\"";this.state = STRING1;continue;
                        case 0x5c:
                            this.string += "\\";this.state = STRING1;continue;
                        case 0x2f:
                            this.string += "\/";this.state = STRING1;continue;
                        case 0x62:
                            this.string += "\b";this.state = STRING1;continue;
                        case 0x66:
                            this.string += "\f";this.state = STRING1;continue;
                        case 0x6e:
                            this.string += "\n";this.state = STRING1;continue;
                        case 0x72:
                            this.string += "\r";this.state = STRING1;continue;
                        case 0x74:
                            this.string += "\t";this.state = STRING1;continue;
                        case 0x75:
                            this.unicode = "";this.state = STRING3;continue;
                    }
                    this.charError(buffer, i);
                case STRING3:case STRING4:case STRING5:case STRING6:
                    // unicode hex codes
                    n = buffer[i];
                    // 0-9 A-F a-f
                    if (n >= 0x30 && n < 0x40 || n > 0x40 && n <= 0x46 || n > 0x60 && n <= 0x66) {
                        this.unicode += String.fromCharCode(n);
                        if (this.state++ === STRING6) {
                            this.string += String.fromCharCode(parseInt(this.unicode, 16));
                            this.unicode = undefined;
                            this.state = STRING1;
                        }
                        continue;
                    }
                    this.charError(buffer, i);
                case NUMBER1:
                    // after minus
                    n = buffer[i];
                    if (n === 0x30) {
                        // `0`
                        this.magnatude = 0;
                        this.state = NUMBER2;
                        continue;
                    }
                    if (n > 0x30 && n < 0x40) {
                        // `1`-`9`
                        this.magnatude = n - 0x30;
                        this.state = NUMBER3;
                        continue;
                    }
                    this.charError(buffer, i);
                case NUMBER2:
                    // * After initial zero
                    switch (buffer[i]) {
                        case 0x2e:
                            // .
                            this.position = 0.1;this.state = NUMBER4;continue;
                        case 0x65:case 0x45:
                            // e/E
                            this.exponent = 0;this.state = NUMBER6;continue;
                    }
                    this.finish();
                    i--; // rewind to re-check this char
                    continue;
                case NUMBER3:
                    // * After digit (before period)
                    n = buffer[i];
                    switch (n) {
                        case 0x2e:
                            // .
                            this.position = 0.1;this.state = NUMBER4;continue;
                        case 0x65:case 0x45:
                            // e/E
                            this.exponent = 0;this.state = NUMBER6;continue;
                    }
                    if (n >= 0x30 && n < 0x40) {
                        // 0-9
                        this.magnatude = this.magnatude * 10 + (n - 0x30);
                        continue;
                    }
                    this.finish();
                    i--; // rewind to re-check
                    continue;
                case NUMBER4:
                    // After period
                    n = buffer[i];
                    if (n >= 0x30 && n < 0x40) {
                        // 0-9
                        this.magnatude += this.position * (n - 0x30);
                        this.position /= 10;
                        this.state = NUMBER5;
                        continue;
                    }
                    this.charError(buffer, i);
                case NUMBER5:
                    // * After digit (after period)
                    n = buffer[i];
                    if (n >= 0x30 && n < 0x40) {
                        // 0-9
                        this.magnatude += this.position * (n - 0x30);
                        this.position /= 10;
                        continue;
                    }
                    if (n === 0x65 || n === 0x45) {
                        // E/e
                        this.exponent = 0;
                        this.state = NUMBER6;
                        continue;
                    }
                    this.finish();
                    i--; // rewind
                    continue;
                case NUMBER6:
                    // After E
                    n = buffer[i];
                    if (n === 0x2b || n === 0x2d) {
                        // +/-
                        if (n === 0x2d) {
                            this.negativeExponent = true;
                        }
                        this.state = NUMBER7;
                        continue;
                    }
                    if (n >= 0x30 && n < 0x40) {
                        this.exponent = this.exponent * 10 + (n - 0x30);
                        this.state = NUMBER8;
                        continue;
                    }
                    this.charError(buffer, i);
                case NUMBER7:
                    // After +/-
                    n = buffer[i];
                    if (n >= 0x30 && n < 0x40) {
                        // 0-9
                        this.exponent = this.exponent * 10 + (n - 0x30);
                        this.state = NUMBER8;
                        continue;
                    }
                    this.charError(buffer, i);
                case NUMBER8:
                    // * After digit (after +/-)
                    n = buffer[i];
                    if (n >= 0x30 && n < 0x40) {
                        // 0-9
                        this.exponent = this.exponent * 10 + (n - 0x30);
                        continue;
                    }
                    this.finish();
                    i--;
                    continue;
                case TRUE1:
                    // r
                    if (buffer[i] === 0x72) {
                        this.state = TRUE2;
                        continue;
                    }
                    this.charError(buffer, i);
                case TRUE2:
                    // u
                    if (buffer[i] === 0x75) {
                        this.state = TRUE3;
                        continue;
                    }
                    this.charError(buffer, i);
                case TRUE3:
                    // e
                    if (buffer[i] === 0x65) {
                        this.state = START;
                        this.emit('boolean', true);
                        continue;
                    }
                    this.charError(buffer, i);
                case FALSE1:
                    // a
                    if (buffer[i] === 0x61) {
                        this.state = FALSE2;
                        continue;
                    }
                    this.charError(buffer, i);
                case FALSE2:
                    // l
                    if (buffer[i] === 0x6c) {
                        this.state = FALSE3;
                        continue;
                    }
                    this.charError(buffer, i);
                case FALSE3:
                    // s
                    if (buffer[i] === 0x73) {
                        this.state = FALSE4;
                        continue;
                    }
                    this.charError(buffer, i);
                case FALSE4:
                    // e
                    if (buffer[i] === 0x65) {
                        this.state = START;
                        this.emit('boolean', false);
                        continue;
                    }
                    this.charError(buffer, i);
                case NULL1:
                    // u
                    if (buffer[i] === 0x75) {
                        this.state = NULL2;
                        continue;
                    }
                    this.charError(buffer, i);
                case NULL2:
                    // l
                    if (buffer[i] === 0x6c) {
                        this.state = NULL3;
                        continue;
                    }
                    this.charError(buffer, i);
                case NULL3:
                    // l
                    if (buffer[i] === 0x6c) {
                        this.state = START;
                        this.emit('NULL', null);
                        continue;
                    }
                    this.charError(buffer, i);
            }
        }
    }

    finish() {
        switch (this.state) {
            case NUMBER2:
                // * After initial zero
                this.emit('Number', 0);
                //this.callbacks.onNumber(0);
                this.state = START;
                this.magnatude = undefined;
                this.negative = undefined;
                break;
            case NUMBER3:
                // * After digit (before period)
                this.state = START;
                if (this.negative) {
                    this.magnatude = -this.magnatude;
                    this.negative = undefined;
                }
                this.emit('Number', this.magnatude);
                //this.callbacks.onNumber(this.magnatude);
                this.magnatude = undefined;
                break;
            case NUMBER5:
                // * After digit (after period)
                this.state = START;
                if (this.negative) {
                    this.magnatude = -this.magnatude;
                    this.negative = undefined;
                }
                this.emit('Number', this.negative ? -this.magnatude : this.magnatude);
                //this.callbacks.onNumber(this.negative ? -this.magnatude : this.magnatude);
                this.magnatude = undefined;
                this.position = undefined;
                break;
            case NUMBER8:
                // * After digit (after +/-)
                if (this.negativeExponent) {
                    this.exponent = -this.exponent;
                    this.negativeExponent = undefined;
                }
                this.magnatude *= Math.pow(10, this.exponent);
                this.exponent = undefined;
                if (this.negative) {
                    this.magnatude = -this.magnatude;
                    this.negative = undefined;
                }
                this.state = START;
                this.emit('Number', this.magnatude);
                //this.callbacks.onNumber(this.magnatude);
                this.magnatude = undefined;
                break;
        }
        if (this.state !== START) {
            //this.callbacks.onError(new Error("Unexpected end of input stream"));
            console.log('Unexpected end of input stream');
        }
    }

    parse(stream) {
        this.reader = stream.getReader();
        this.read().catch(e => console.log(e));
    }
}