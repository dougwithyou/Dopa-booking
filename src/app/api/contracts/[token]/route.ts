import { NextResponse, type NextRequest } from 'next/server';
import type { Contract, Studio } from '@/types/db';
import { adminDb, jsonError } from '@/app/api/_lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/contracts/[token]
 *
 * Public, unauthenticated — the token itself is the access control (a
 * random uuid, not enumerable). Only `sent` and `signed` contracts are
 * visible; `draft` (not sent yet) and `void` (cancelled) both 404 so a
 * guessed or stale link doesn't leak anything.
 *
 * 200: { id, title, content, status, studioName, providerSignerName, providerSignatureUrl, signerName, signedAt, pdfUrl }
 */
export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  const db = adminDb();

  const { data: contract, error } = await db
    .from('contracts')
    .select('*')
    .eq('public_token', params.token)
    .maybeSingle();
  if (error) {
    console.error('[contracts] GET failed', error);
    return jsonError(500, 'contract_lookup_failed');
  }

  const row = contract as Contract | null;
  if (!row || row.status === 'draft' || row.status === 'void') {
    return jsonError(404, 'contract_not_found');
  }

  const { data: studio } = await db
    .from('studios')
    .select('name, provider_signer_name, provider_signature_url')
    .eq('id', row.studio_id)
    .maybeSingle();
  const studioFields = studio as Pick<Studio, 'name' | 'provider_signer_name' | 'provider_signature_url'> | null;

  return NextResponse.json({
    id: row.id,
    title: row.title,
    content: row.content,
    status: row.status,
    studioName: studioFields?.name ?? 'Dopa Studio',
    providerSignerName: studioFields?.provider_signer_name ?? null,
    providerSignatureUrl: studioFields?.provider_signature_url ?? null,
    signerName: row.signer_name,
    signedAt: row.signed_at,
    pdfUrl: row.pdf_url,
  });
}
