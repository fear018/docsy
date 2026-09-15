import { z } from 'zod';

/** Shared validation. Every route and action parses external input with these. */

export const botNameSchema = z
  .string()
  .trim()
  .min(1, 'Give the bot a name.')
  .max(60, 'Keep the name under 60 characters.');

export const createBotSchema = z.object({
  name: botNameSchema,
});

export const renameBotSchema = z.object({
  botId: z.uuid(),
  name: botNameSchema,
});

export const botIdSchema = z.object({
  botId: z.uuid(),
});

/** What a source can be built from. Mirrors the source_type enum. */
export const SOURCE_TYPES = ['file', 'url', 'sitemap', 'text'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

/**
 * Only http(s), and no addresses that resolve inside our own network —
 * a crawler that will fetch any URL a user supplies is an SSRF hole.
 */
export const publicUrlSchema = z
  .url('Enter a full URL, including https://')
  .refine((value) => /^https?:\/\//i.test(value), 'Only http and https are supported.')
  .refine((value) => {
    const host = new URL(value).hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
      return false;
    }
    // IPv4 private and loopback ranges, plus IPv6 loopback.
    return !/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?$)/.test(
      host,
    );
  }, 'That address is not reachable from the public internet.');

export const addUrlSourceSchema = z.object({
  botId: z.uuid(),
  url: publicUrlSchema,
  /** Follow the site's sitemap instead of indexing the single page. */
  crawlSite: z.boolean().default(false),
  /** Restrict a site crawl to URLs starting with this path, e.g. /docs. */
  pathPrefix: z.string().trim().max(200).optional(),
});

export const addTextSourceSchema = z.object({
  botId: z.uuid(),
  title: z.string().trim().min(1, 'Give this note a title.').max(200),
  content: z.string().trim().min(1, 'Paste some text first.').max(500_000),
});

export const sourceIdSchema = z.object({
  sourceId: z.uuid(),
});

/** A CSS colour we are willing to inject into the widget's styles. */
const hexColour = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, 'Use a hex colour such as #3b6fd4.');

export const widgetConfigSchema = z.object({
  botId: z.uuid(),
  title: z.string().trim().min(1, 'Give the widget a title.').max(40),
  greeting: z.string().trim().max(200).optional().or(z.literal('')),
  accent: hexColour,
  position: z.enum(['right', 'left']),
  /** Up to four one-tap questions shown before the visitor types. */
  starters: z.array(z.string().trim().max(80)).max(4).default([]),
  /**
   * Domains the widget may run on. Empty means unrestricted, which is the
   * honest default before the owner has installed it anywhere.
   */
  allowedOrigins: z.array(z.string().trim().max(200)).max(20).default([]),
});

export type WidgetConfigInput = z.infer<typeof widgetConfigSchema>;
