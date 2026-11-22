import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ONLINE',
      service: 'ZeroTax Next.js ITR Platform',
      compliance: 'CERT-In / RBI / DPDP Act 2023',
      version: '2026.1.0',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
