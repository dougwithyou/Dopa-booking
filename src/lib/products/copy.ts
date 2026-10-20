import type { Product } from '@/types/db';

/**
 * Locale-aware product name/description. `name`/`description` are the
 * English copy; Spanish uses `name_es`/`description_es` and falls back to
 * English when those are empty.
 */
export function productCopy(
  product: Pick<Product, 'name' | 'description' | 'name_es' | 'description_es'>,
  locale: string
): { name: string; description: string | null } {
  if (locale === 'es') {
    return {
      name: product.name_es?.trim() || product.name,
      description: product.description_es?.trim() || product.description,
    };
  }
  return { name: product.name, description: product.description };
}
