import { app } from '@/src/app';

export const dynamic = 'force-dynamic';

export const GET = (req: Request) => app.fetch(req);
export const OPTIONS = (req: Request) => app.fetch(req);
