import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStudioId } from '@/components/admin/lib/data';
import { generateLandingCopy, MAX_BRIEF_LENGTH } from '@/lib/landing/ai';
import { getTemplate } from '@/lib/landing/templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Drafting ~20 bilingual fields takes longer than Vercel's default timeout.
export const maxDuration = 60;

/**
 * POST /api/admin/landing-pages/generate
 *
 * Same auth boundary as /api/admin/contracts/generate: middleware skips
 * /api/*, so getStudioId() (which requires a signed-in studio admin) is the
 * entire check.
 *
 * Body: { brief: string, template: string }
 * 200: { copy: LandingCopy }
 * 400: { error: 'invalid_request' }
 * 401: { error: 'unauthorized' }
 * 502: { error: 'generation_failed' }
 */
function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}

const GenerateSchema = z.object({
  brief: z.string().trim().min(1).max(MAX_BRIEF_LENGTH),
  template: z.string().max(64).optional(),
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
    const copy = await generateLandingCopy({
      brief: payload.brief,
      studioName,
      templateLabel: getTemplate(payload.template)?.label ?? 'General',
    });
    return NextResponse.json({ copy });
  } catch (error) {
    console.error('[api/admin/landing-pages/generate] generation failed', error);
    return jsonError(502, 'generation_failed');
  }
}
