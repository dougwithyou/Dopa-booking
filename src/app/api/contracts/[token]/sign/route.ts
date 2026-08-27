import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import type { Client, Contract, Studio } from '@/types/db';
import { adminDb, jsonError } from '@/app/api/_lib/payments';
import { renderContractPdf } from '@/lib/contracts/pdf';
import { uploadContractPdf } from '@/lib/contracts/storage';
import { sendContractSignedNotification } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SignSchema = z.object({
  signerName: z.string().trim().min(1).max(200),
  signerIdNumber: z.string().trim().max(100).nullish(),
  // A PNG data URL from the signature canvas, e.g. "data:image/png;base64,...".
  signatureDataUrl: z.string().startsWith('data:image/png;base64,').max(2_000_000),
});

function clientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * POST /api/contracts/[token]/sign
 *
 * Public, unauthenticated. Body: { signerName, signerIdNumber?, signatureDataUrl }
 * 200: { pdfUrl }
 * 409: { error: 'already_signed' } | { error: 'contract_void' }
 * 404: { error: 'contract_not_found' }
 *
 * There is no public UPDATE policy on `contracts` (see migration
 * 0007_contracts.sql) — everything here runs through the service-role
 * client after validating the contract is actually in a signable state,
 * the same pattern as the booking-hold routes.
 */
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  let payload: z.infer<typeof SignSchema>;
  try {
    payload = SignSchema.parse(await request.json());
  } catch (error) {
    return jsonError(400, 'invalid_request', {
      details: error instanceof z.ZodError ? error.flatten() : undefined,
    });
  }

  const db = adminDb();

  const { data: contractRaw, error: fetchError } = await db
    .from('contracts')
    .select('*')
    .eq('public_token', params.token)
    .maybeSingle();
  if (fetchError) {
    console.error('[contracts/sign] lookup failed', fetchError);
    return jsonError(500, 'contract_lookup_failed');
  }

  const contract = contractRaw as Contract | null;
  if (!contract || contract.status === 'draft') {
    return jsonError(404, 'contract_not_found');
  }
  if (contract.status === 'void') {
    return jsonError(409, 'contract_void');
  }
  if (contract.status === 'signed') {
    return jsonError(409, 'already_signed');
  }

  const signedAtIso = new Date().toISOString();
  const signerIp = clientIp(request);

  const { data: studio } = await db
    .from('studios')
    .select('provider_signer_name, provider_signature_url')
    .eq('id', contract.studio_id)
    .maybeSingle();
  const providerFields = studio as Pick<Studio, 'provider_signer_name' | 'provider_signature_url'> | null;

  let pdfUrl: string;
  try {
    const pdfBuffer = await renderContractPdf({
      title: contract.title,
      content: contract.content,
      signerName: payload.signerName,
      signerIdNumber: payload.signerIdNumber,
      signatureDataUrl: payload.signatureDataUrl,
      signedAtIso,
      signerIp,
      providerSignerName: providerFields?.provider_signer_name,
      providerSignatureUrl: providerFields?.provider_signature_url,
    });
    pdfUrl = await uploadContractPdf(db, contract.id, pdfBuffer);
  } catch (error) {
    console.error('[contracts/sign] PDF generation/upload failed', error);
    return jsonError(500, 'pdf_generation_failed');
  }

  // Guarded update: only succeeds from 'sent', so two concurrent submits
  // (e.g. a double-click) can't both "win" and send two notifications.
  const { data: updated, error: updateError } = await db
    .from('contracts')
    .update({
      status: 'signed',
      signer_name: payload.signerName,
      signer_id_number: payload.signerIdNumber || null,
      signature_data: payload.signatureDataUrl,
      signer_ip: signerIp,
      signed_at: signedAtIso,
      pdf_url: pdfUrl,
    })
    .eq('id', contract.id)
    .eq('status', 'sent')
    .select('*')
    .maybeSingle();

  if (updateError) {
    console.error('[contracts/sign] update failed', updateError);
    return jsonError(500, 'sign_failed');
  }
  if (!updated) {
    return jsonError(409, 'already_signed');
  }

  let clientEmail: string | null = null;
  if (contract.client_id) {
    const { data: client } = await db.from('clients').select('email').eq('id', contract.client_id).maybeSingle();
    clientEmail = (client as Pick<Client, 'email'> | null)?.email ?? null;
  }

  await sendContractSignedNotification({
    contractTitle: contract.title,
    signerName: payload.signerName,
    clientEmail,
    signedAtIso,
    pdfUrl,
  });

  return NextResponse.json({ pdfUrl });
}
