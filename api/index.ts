import { handle } from '@hono/node-server/vercel';
import { app } from '../src/app.js';

export const config = {
  runtime: 'nodejs',
  regions: ['bom1'],
};

const vercelHandler = handle(app);

export default async function handler(req: any, res: any) {
  if (!req.url || req.url === '/' || req.url === '') {
    req.url = '/health';
  }
  return vercelHandler(req, res);
}
