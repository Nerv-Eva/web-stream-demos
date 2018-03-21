(async () => {
    const response = await (await fetch('./sample.json')).json();
    console.log(response[0].data);
    for (const one of response[0].data) {
        addNewLine(one);
    }
})()

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