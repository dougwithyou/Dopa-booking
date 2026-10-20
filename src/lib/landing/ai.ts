import 'server-only';
import { z } from 'zod/v4';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { getAnthropicClient } from '@/lib/anthropic';

const MODEL = 'claude-opus-5-5';
const MAX_OUTPUT_TOKENS = 16000;

/** Shared with the route's request validation and the editor's textarea. */
export const MAX_BRIEF_LENGTH = 3000;

export const LandingCopySchema = z.object({
  eyebrow_en: z.string(),
  eyebrow_es: z.string(),
  headline_en: z.string(),
  headline_es: z.string(),
  subheadline_en: z.string(),
  subheadline_es: z.string(),
  cta_primary_en: z.string(),
  cta_primary_es: z.string(),
  cta_secondary_en: z.string(),
  cta_secondary_es: z.string(),
  gallery_heading_en: z.string(),
  gallery_heading_es: z.string(),
  about_heading_en: z.string(),
  about_heading_es: z.string(),
  about_body_en: z.string(),
  about_body_es: z.string(),
  closer_heading_en: z.string(),
  closer_heading_es: z.string(),
  closer_body_en: z.string(),
  closer_body_es: z.string(),
});

export type LandingCopy = z.infer<typeof LandingCopySchema>;

const SYSTEM_PROMPT = `You write the copy for a photography studio's bilingual (English/Spanish) booking landing page. The studio admin gives you a short brief about the session being promoted; you return every text field of the page. The admin reviews and edits everything before publishing.

## The page, top to bottom
- eyebrow: a tiny uppercase label above the headline naming the session or season (2-4 words).
- headline: the big hero line, 3-8 words, evocative rather than descriptive.
- subheadline: one or two sentences under the headline saying what the session is and who it's for.
- cta_primary: the main button that jumps to booking (2-4 words, an action).
- cta_secondary: the second button that scrolls to the photo gallery (2-4 words).
- gallery_heading: heading above the photo gallery (3-7 words).
- about_heading and about_body: a short section about the studio and its approach to this kind of session. about_body is 2 short paragraphs separated by a blank line, written in the studio's warm first-person-plural voice.
- closer_heading and closer_body: the final section right above the booking button - a gentle nudge to book now (closer_body: 1-2 sentences).

## House conventions
- In headline, gallery_heading and closer_heading, wrap exactly one emphasized word in double asterisks, e.g. "Este año, guarda la **magia**." The page renders that word in the studio's signature outlined style. Use no other markdown anywhere.
- Spanish and English must each read as natively written copy, not word-for-word translations of each other. Spanish is neutral Latin American Spanish using "tú".
- Warm, personal, a little poetic; never salesy, no exclamation-mark spam, no emoji.

## Stay truthful
Only state facts the brief gives you. Do not invent prices, discounts, dates, deadlines, locations, session lengths, number of photos, awards, years in business, or client counts - if the brief doesn't mention something, write around it. Never write testimonials or quotes attributed to clients.`;

export async function generateLandingCopy(params: {
  brief: string;
  studioName: string;
  templateLabel: string;
}): Promise<LandingCopy> {
  const client = getAnthropicClient();

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    // Server-side refusal fallback: if a safety classifier declines, the API
    // re-runs the same request on a suitable fallback model in this call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: zodOutputFormat(LandingCopySchema) },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Studio name: ${params.studioName}\nTemplate / session type: ${params.templateLabel}\n\nAdmin's brief:\n${params.brief}`,
      },
    ],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('The model declined to write copy for this brief.');
  }
  if (!response.parsed_output) {
    throw new Error(`No structured copy returned (stop_reason: ${response.stop_reason}).`);
  }
  return response.parsed_output;
}
