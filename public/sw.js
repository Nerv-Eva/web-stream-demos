const version = 1;
const cacheName = `web-stream-demos-cache-${version}`;
var decoder = new TextDecoder();
var encoder = new TextEncoder();

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(cacheName).then(cache => {
            return ;
        })
    )
});

self.addEventListener('fetch', event => {
    console.log(event)
    if (event.request.url.indexOf('stream')!==-1) {
        event.respondWith(streamContent());
    }
});

function streamContent () {
    try {
        new ReadableStream({});
    } catch (e) {
        return new Response("Streams not supported!");
    }
    const stream = new ReadableStream({
        start(controller) {
            const startFetch = fetch('/long?via=stream').catch((e) => new Response(e.toString()));

            function pushStream (stream) {
                const reader = stream.getReader();
                function read () {
                    return reader.read().then(result => {
                        if (result.done) return;
                        console.log(
                            'block'
                        );
                        controller.enqueue(encoder.encode(html2Escape(decoder.decode(result.value, {stream: true}))));
                        return read();
                    })
                }
                return read();
            }

            startFetch
                .then(response => pushStream(response.body))
                .then(() => controller.close());
        }

    });

    return new Response(stream, {
        headers: {'Content-Type': 'text/html'}
    })
}

self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

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