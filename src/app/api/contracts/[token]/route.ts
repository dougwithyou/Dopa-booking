import { NextResponse, type NextRequest } from 'next/server';
import type { Client, Contract, Studio } from '@/types/db';
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
 * 200: { id, title, content, status, studioName, providerSignerName, providerSignatureUrl,
 *        clientName, clientEmail, signerName, signedAt, pdfUrl }
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

  let clientName: string | null = null;
  let clientEmail: string | null = null;
  if (row.client_id) {
    const { data: client } = await db.from('clients').select('name, email').eq('id', row.client_id).maybeSingle();
    const clientFields = client as Pick<Client, 'name' | 'email'> | null;
    clientName = clientFields?.name ?? null;
    clientEmail = clientFields?.email ?? null;
  }

  return NextResponse.json({
    id: row.id,
    title: row.title,
    content: row.content,
    status: row.status,
    studioName: studioFields?.name ?? 'Dopa Studio',
    providerSignerName: studioFields?.provider_signer_name ?? null,
    providerSignatureUrl: studioFields?.provider_signature_url ?? null,
    clientName,
    clientEmail,
    signerName: row.signer_name,
    signedAt: row.signed_at,
    pdfUrl: row.pdf_url,
  });
}
