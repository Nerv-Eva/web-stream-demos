const htmls = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "\n": '<br>'
}

function html2Escape(sHtml) {
    return sHtml.replace(/[<>&"\n]/g, (c) => htmls[c] );
}

document.addEventListener('DOMContentLoaded', async () => document.getElementById('content').innerHTML = html2Escape(await (await fetch('/long')).text()));