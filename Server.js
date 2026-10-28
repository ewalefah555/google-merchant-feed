import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';

const app = new Hono();

app.use('/feeds/*', serveStatic({ root: './' }));

app.get('/', (c) => c.text('Multi-Currency Feed Engine Is Online!'));

console.log('🚀 Server running on port 3000');
serve({ fetch: app.fetch, port: 3000 });
