import express from 'express';
var path = require('path');
import Promise from 'bluebird';
import fs from 'fs';

const fsStat = Promise.promisify(fs.stat)
const apiBase = 'https://en.wikipedia.org/w/api.php?';

const app = express();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static('public'));

/*
app.get('/demo1', (req, res) => {
    console.log(req)
    res.render('demo1', { title: 'Render large text block via Web Socket Demo'});
})
*/

app.get('/', (req, res) => {
    console.log('/')
    res.write(`<!DOCTYPE html><html>  <head>
        <meta charset="utf-8">
        <title>Web Stream Demos</title>
        <style>
          *{
            margin: 0;
            padding: 0;
          }
          nav {
            background-color: #000;
            color: #ffffff;
            width: 100%;
            height: 30px;
            text-align: center;
          }
        </style>
      </head>
      <script> if('serviceWorker' in navigator)
        { navigator.serviceWorker.register('/sw.js')}
      </script><body>

      <nav>I'm from server render</nav></body></html>`)
    res.end();
})

app.get('/:query', async (req, res) => {
    const query = req.params.query;
    if (query === 'robots.txt') {
        res.end();
        return;
    }
    try {
        await fsStat(`./views/${query}.pug`)
        res.render(query, { title: 'Render large text block via Web Socket Demo'});
    } catch (e) {
        try {
            if (query === 'long') {
                const fileStream = fs.createReadStream('./longtext', { highWaterMark: 1024 })
                fileStream.pipe(res, {end: false});
                fileStream.on("end", () => {
                    res.end();
                });
            }
        } catch (e) {
            console.log(e)
        }
    }
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.info(`The server is running at http://localhost:${port}/`)
});