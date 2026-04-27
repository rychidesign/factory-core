import { createClient, type SanityClient } from '@sanity/client';
import {
  SANITY_PROJECT_ID,
  SANITY_DATASET,
  SANITY_API_VERSION,
  SANITY_READ_TOKEN,
} from 'astro:env/server';

/**
 * Returns a configured Sanity client, or null if the project hasn't been
 * wired up yet (no SANITY_PROJECT_ID env var).
 *
 * Pages should use `fetchOrMock(query, mockValue)` rather than calling
 * this directly — that helper transparently substitutes mock data so
 * `pnpm dev` works on a freshly cloned template without credentials.
 */
let _client: SanityClient | null = null;
export function sanityClient(): SanityClient | null {
  if (_client) return _client;
  if (!SANITY_PROJECT_ID) return null;
  _client = createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET ?? 'production',
    apiVersion: SANITY_API_VERSION ?? '2025-01-01',
    token: SANITY_READ_TOKEN,
    useCdn: !SANITY_READ_TOKEN, // CDN for public content, fresh for drafts.
    perspective: 'published',
  });
  return _client;
}

/**
 * Run a GROQ query, or return a mock value when no Sanity project is
 * configured. Pages call this so the scaffold renders without credentials
 * and seamlessly switches to live data once the operator sets env vars.
 */
export async function fetchOrMock<T>(
  query: string,
  params: Record<string, unknown>,
  mockValue: T,
): Promise<T> {
  const client = sanityClient();
  if (!client) return mockValue;
  return client.fetch<T>(query, params);
}
