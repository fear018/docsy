import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Copies the built embed loader into public/.
 *
 * The widget package builds into its own dist/ so Turborepo can track and cache
 * that output. Writing straight into this app's public/ looked simpler, but a
 * cache hit would replay the log without producing the file, and the site would
 * ship without a widget.
 */
const here = dirname(fileURLToPath(import.meta.url));
const from = join(here, '../../../packages/widget/dist/widget.js');
const to = join(here, '../public/widget.js');

await mkdir(dirname(to), { recursive: true });
await copyFile(from, to);
