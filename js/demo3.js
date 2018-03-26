import StreamJSONParser from 'web-stream-json-parser';
function addNewLine (data) {
    let html = `
<td>${data.field}</td>
<td>${data.age}</td>
<td>${data.sex}</td>
<td>${data.isAlive?'YES':'NO'}</td>
<td>${data['investigation-year']}</td>
<td>${data.count}</td>
`;
    const tr = document.createElement("tr");
    tr.innerHTML = html;
    const table = document.getElementById('tb');
    table.appendChild(tr);
}

(async ()=>{
    let startParseData = false;
    let parsingData = false;
    const parser = new StreamJSONParser();
    const response = await fetch('./sample.json');
    let one = '';
    parser.parse(response.body);
    parser.on('string', str => {
        if (str === 'data') {
            startParseData = true;
        }
        if (startParseData && parsingData) {
            one += `"${str}"`
        }
    })
    parser.on('number', number => {
        if (startParseData && parsingData) {
            one += number.toString();
        }
    })
    parser.on('boolean', boolean => {
        if (startParseData && parsingData) {
            if (boolean) {
                one += 'true';
            } else {
                one += 'false';
            }
        }
    })
    parser.on('startArray', () => {
        if (startParseData) {
            parsingData = true;
        }
    })
    parser.on('endArray', () => {
        if (startParseData && parsingData) {
            startParseData = false;
            parsingData = false;
            parser.cancel();
        }
    })
    parser.on('startObject', () => {
        if (startParseData && parsingData) {
            one += '{';
        }
    })
    parser.on('endObject', () => {
        if (startParseData && parsingData) {
            one += '}';
            addNewLine(JSON.parse(one))
            one = '';
        }
    })
    parser.on('colon', () => {
        if (startParseData && parsingData) {
            one += ':';
        }
    })
    parser.on('comma', () => {
        if (startParseData && parsingData && one !== '') {
            one+=','
        }
    })
})()