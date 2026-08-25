import { app } from './src/app.js';
import fs from 'fs';

const routes = app.routes.map(r => ({
  method: r.method,
  path: r.path
}));

const uniqueRoutes = Array.from(new Set(routes.map(r => `${r.method} ${r.path}`))).sort();
fs.writeFileSync('routes.json', JSON.stringify(uniqueRoutes, null, 2));
console.log('Routes dumped to routes.json');
