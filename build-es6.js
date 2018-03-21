import fs from 'fs';
import * as babel from 'babel-core';

fs.readdirSync('./js')
    .map(file => fs.writeFileSync(`./public/${file}`, babel.transformFileSync(`./js/${file}`).code))