import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

// Lazy singleton, mirrors getStripe() in src/lib/stripe.ts — constructed on
// first use so a missing ANTHROPIC_API_KEY surfaces as a runtime error on
// the routes that need it, not at build time.
let cachedClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!cachedClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    cachedClient = new Anthropic({ apiKey });
  }
  return cachedClient;
}
