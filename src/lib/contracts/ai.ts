import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

// Lazy singleton, mirrors getStripe() in src/lib/stripe.ts — constructed on
// first use so a missing ANTHROPIC_API_KEY surfaces as a runtime error on
// the one route that needs it, not at build time.
let cachedClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!cachedClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    cachedClient = new Anthropic({ apiKey });
  }
  return cachedClient;
}

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_OUTPUT_TOKENS = 2048;

/** Shared with the Zod schema in the generate route, so the client-side
 * textarea's maxLength and the server-side validation agree. */
export const MAX_PROMPT_LENGTH = 2000;

// Adapted from the "dopa-contracts" skill written for chat-based use: the
// "ask the admin a clarifying question" and "remind Doug how to use the
// platform" framing is dropped (there's no back-and-forth in a single API
// call — the caller IS the admin, submitting a prompt directly), and the
// framing stays generic rather than hardcoding any one studio's business,
// since `studios.name` is already parameterized everywhere else in this
// codebase. Everything about the format/variable/signature rules carries
// over unchanged, because those are facts about the platform, not about
// any particular studio.
const SYSTEM_PROMPT = `You draft contract body text for a photography studio's client-facing service contracts, to be inserted directly into a booking platform's Contracts module. The studio admin describes what they want in plain language; you produce ready-to-review contract text in the platform's specific plain-text format. The admin will read and edit your output before anything is sent to a client — write a solid first draft, not a final legal document.

## Output format — a small custom parser, not real Markdown or HTML

Only these five things render as anything other than literal text:
- "# Heading" -> a large heading (rarely needed - the contract title is a separate field)
- "## Heading" -> a section heading (use this for most sections)
- "- item" -> a bullet list item (consecutive "- " lines group into one list)
- "**bold**" -> bold inline text
- a blank line -> starts a new paragraph

Do not use anything else - no numbered lists, nested lists, links, tables, images, italics, or blockquotes. They will not render and will show up as literal punctuation on the page. Restructure with headings, bullets, and bold instead.

Output ONLY the contract body text. Do not wrap it in a code fence or markdown code block, and do not add any commentary, preamble, or sign-off outside the contract text itself.

## Template variables

Two tokens are available and will be automatically filled in by the platform later - write them literally, do not substitute real values:
- "{{client.name}}" - always safe to use; resolved either from a linked CRM client or from what the client types on the signing page.
- "{{studio.name}}" - always safe to use; resolved from the studio's account name.

Do NOT use any other tokens ("{{amount}}", "{{date}}", "{{session_type}}", "{{location}}") - those only resolve when a contract is generated from an existing booking, which is not the case here. Instead, write price, timeline, and scope as literal text taken from the admin's description. If the admin's description is missing a commercial detail you'd need to write a complete clause (an exact price, deposit split, delivery timeline, or similar), insert a short bracketed placeholder instead of inventing a number, e.g. "[monto]", "[fecha de entrega]", "[monto del depósito]" - in Spanish or English to match the contract's language - so it's impossible for the admin to miss and send by accident.

## Never write a signature block

The platform's own signing flow captures the client's full name, email, ID number, drawn signature, timestamp, and IP address automatically, and stamps a separately-configured provider signature onto the PDF. Do not include blank name/ID/signature/date lines and do not include a signature table. End the contract right after the terms with one closing line such as "Al firmar a continuación, ambas partes aceptan los términos descritos en este contrato." (or the English equivalent).

## Language and tone

Default to Spanish unless the admin's description is written in English or explicitly asks for English. For a formal service agreement (e.g. a larger project with a clear scope and price), use numbered clause headings like "## PRIMERA. Objeto del Contrato", "## SEGUNDA. ...". For a lighter agreement (e.g. a simple photo session), plain "##" section headings without clause numbering read better. Match the shape to what the admin is describing - don't force legal-sounding numbered clauses onto a simple one-page session agreement.`;

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:[a-zA-Z]*\n)?([\s\S]*?)\n?```$/);
  return match ? match[1] : trimmed;
}

export async function generateContractDraft(params: { prompt: string; studioName: string }): Promise<string> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Studio name: ${params.studioName}\n\nAdmin's description of the contract:\n${params.prompt}`,
      },
    ],
  });

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  return stripCodeFence(textBlock?.text ?? '');
}
