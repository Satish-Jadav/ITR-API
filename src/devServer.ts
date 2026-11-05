import { serve } from '@hono/node-server';
import { app } from './app.js';
import { env } from './config/env.js';

const port = env.PORT || 3000;
console.log(`🚀 ZeroTax Production Node.js API starting in ${env.NODE_ENV} mode...`);
console.log(`🔒 Region: bom1 (Mumbai ap-south-1) | Compliance: CERT-In, RBI, DPDP Act 2023`);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`✅ ZeroTax API listening on http://localhost:${info.port}`);
  }
);
