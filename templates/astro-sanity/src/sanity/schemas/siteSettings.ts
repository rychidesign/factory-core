/**
 * Sanity schema definition for siteSettings — singleton holding nav, brand
 * name, contact info. The factory's cms-builder agent extends this with
 * project-specific fields based on spec/scope.yaml.
 *
 * This file is imported by the standalone Sanity Studio (studio/sanity.config.ts).
 * The runtime type below is used by the Astro site to type GROQ results.
 */

export type SiteSettings = {
  brandName: string;
  navItems: Array<{ label: string; href: string }>;
};

export const siteSettingsSchema = {
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    {
      name: 'brandName',
      title: 'Brand name',
      type: 'string',
      validation: (Rule: { required: () => unknown }) => Rule.required(),
    },
    {
      name: 'navItems',
      title: 'Navigation items',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'label', type: 'string', validation: (Rule: { required: () => unknown }) => Rule.required() },
            { name: 'href', type: 'string', validation: (Rule: { required: () => unknown }) => Rule.required() },
          ],
        },
      ],
    },
  ],
};
