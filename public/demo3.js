function addNewLine(data) {
    let html = `
<td>${data.field}</td>
<td>${data.age}</td>
<td>${data.sex}</td>
<td>${data.isAlive ? 'YES' : 'NO'}</td>
<td>${data['investigation-year']}</td>
<td>${data.count}</td>
`;
    const tr = document.createElement("tr");
    tr.innerHTML = html;
    const table = document.getElementById('tb');
    table.appendChild(tr);
}

(async () => {
    let startParseData = false;
    let parsingData = false;
    const parser = new StreamJSONPaser();
    const response = await fetch('./sample.json');
    let one = '';
    parser.parse(response.body);
    parser.on('String', str => {
        if (str === 'data') {
            startParseData = true;
        }
        if (startParseData && parsingData) {
            one += `"${str}"`;
        }
    });
    parser.on('Number', number => {
        if (startParseData && parsingData) {
            one += number.toString();
        }
    });
    parser.on('boolean', boolean => {
        if (startParseData && parsingData) {
            if (boolean) {
                one += 'true';
            } else {
                one += 'false';
            }
        }
    });
    parser.on('onStartArray', () => {
        if (startParseData) {
            parsingData = true;
        }
    });
    parser.on('onEndArray', () => {
        if (startParseData && parsingData) {
            startParseData = false;
            parsingData = false;
            parser.cancel();
        }
    });
    parser.on('startObject', () => {
        if (startParseData && parsingData) {
            one += '{';
        }
    });
    parser.on('onEndObject', () => {
        if (startParseData && parsingData) {
            one += '}';
            addNewLine(JSON.parse(one));
            console.log(JSON.parse(one));
            one = '';
        }
    });
    parser.on('onColon', () => {
        if (startParseData && parsingData) {
            one += ':';
        }
    });
    parser.on('onComma', () => {
        if (startParseData && parsingData && one !== '') {
            one += ',';
        }
    });
})();