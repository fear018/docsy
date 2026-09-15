import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chunkMarkdown } from '../chunk';

const docsPage = `# Getting Started

Docsy turns your documentation into a chatbot that answers with citations.

## Installation

Install the package from npm before you begin.

### Docker

Run the container with the command below.

\`\`\`bash
docker run -p 3000:3000 \\
  -e API_KEY=your-key \\
  --name docsy \\
  docsy/server:latest
\`\`\`

The container listens on port 3000 by default.

## Configuration

Set the environment variables your deployment needs.
`;

describe('chunkMarkdown', () => {
  it('records the full heading path for each chunk', () => {
    const chunks = chunkMarkdown(docsPage);
    const paths = chunks.map((c) => c.headingPath);
    assert.ok(
      paths.some((p) => p === 'Getting Started > Installation > Docker'),
      `expected a nested heading path, got ${JSON.stringify(paths)}`,
    );
  });

  it('never splits a fenced code block', () => {
    const chunks = chunkMarkdown(docsPage);
    const withCode = chunks.filter((c) => c.content.includes('docker run'));
    assert.equal(withCode.length, 1, 'the snippet appears in exactly one chunk');
    const content = withCode[0]!.content;
    const fences = content.match(/```/g) ?? [];
    assert.equal(fences.length % 2, 0, 'fences are balanced, so the block is whole');
    assert.ok(content.includes('docsy/server:latest'), 'the snippet reaches its last line');
  });

  it('keeps a long code block whole even past the size limit', () => {
    const long = [
      '# API',
      '',
      '```ts',
      ...Array.from({ length: 900 }, (_, i) => `const v${i} = ${i};`),
      '```',
    ].join('\n');
    const chunks = chunkMarkdown(long);
    const withCode = chunks.filter((c) => c.content.includes('const v899'));
    assert.equal(withCode.length, 1);
    assert.ok(withCode[0]!.content.includes('const v0 = 0;'), 'starts at the first line');
  });

  it('splits prose that exceeds the limit', () => {
    const sentence = 'This sentence exists purely to take up space in the document. ';
    const chunks = chunkMarkdown(`# Long\n\n${sentence.repeat(400)}`);
    assert.ok(chunks.length > 1, 'long prose produces several chunks');
    assert.ok(
      chunks.every((c) => c.tokenCount <= 1000),
      `no chunk runs away: ${chunks.map((c) => c.tokenCount).join(', ')}`,
    );
  });

  it('starts a new chunk when the heading path changes', () => {
    const chunks = chunkMarkdown(docsPage);
    const paths = new Set(chunks.map((c) => c.headingPath));
    assert.ok(paths.size > 1, 'sections do not bleed into one another');
  });

  it('returns nothing for empty input', () => {
    assert.deepEqual(chunkMarkdown('   \n\n  '), []);
  });
});
