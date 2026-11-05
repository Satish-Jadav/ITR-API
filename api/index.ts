import { handle } from 'hono/vercel';
import { app } from '../src/app.js';

export const config = {
  runtime: 'nodejs',
  regions: ['bom1'],
};

export default handle(app);
