/**
 * Generic page document. Most marketing routes (/about, /services, /contact)
 * map to one of these. The cms-builder agent typically replaces this with
 * project-specific document types (e.g. caseStudy, service) during Phase 4.
 */

export type SanityPage = {
  slug: string;
  title: string;
  intro?: string;
  body?: unknown; // Sanity Portable Text — typed by the consuming page.
};

export const pageSchema = {
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    { name: 'title', type: 'string', validation: (Rule: { required: () => unknown }) => Rule.required() },
    {
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule: { required: () => unknown }) => Rule.required(),
    },
    { name: 'intro', type: 'text', rows: 3 },
    { name: 'body', type: 'array', of: [{ type: 'block' }] },
  ],
};
