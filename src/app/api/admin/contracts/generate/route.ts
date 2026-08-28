import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStudioId } from '@/components/admin/lib/data';
import { generateContractDraft, MAX_PROMPT_LENGTH } from '@/lib/contracts/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/contracts/generate
 *
 * This is the first `/api/admin/**` route in the codebase — every other
 * admin CRUD action goes straight through the browser Supabase client under
 * RLS. This one needs a server-side ANTHROPIC_API_KEY, so it has to be a
 * route handler, and `src/middleware.ts`'s matcher explicitly excludes
 * `/api/*` from its session-redirect logic — so the getStudioId() call below
 * is the *entire* auth boundary here, not a defensive extra.
 *
 * Body: { prompt: string }
 * 200: { content: string }
 * 400: { error: 'invalid_request' }
 * 401: { error: 'unauthorized' }
 * 502: { error: 'generation_failed' }
 */
function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}

const GenerateSchema = z.object({
  prompt: z.string().trim().min(1).max(MAX_PROMPT_LENGTH),
});

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  let studioName: string;
  try {
    const studioId = await getStudioId(supabase);
    const { data: studio } = await supabase.from('studios').select('name').eq('id', studioId).single();
    studioName = studio?.name ?? 'the studio';
  } catch {
    return jsonError(401, 'unauthorized');
  }

  let payload: z.infer<typeof GenerateSchema>;
  try {
    payload = GenerateSchema.parse(await request.json());
  } catch {
    return jsonError(400, 'invalid_request');
  }

  try {
    const content = await generateContractDraft({ prompt: payload.prompt, studioName });
    return NextResponse.json({ content });
  } catch (error) {
    console.error('[api/admin/contracts/generate] generation failed', error);
    return jsonError(502, 'generation_failed');
  }
}
