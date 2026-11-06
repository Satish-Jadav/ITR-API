import { handle } from '@hono/node-server/vercel';
import { app } from '../src/app.js';

export const config = {
  runtime: 'nodejs',
  regions: ['bom1'],
};

export default handle(app);
