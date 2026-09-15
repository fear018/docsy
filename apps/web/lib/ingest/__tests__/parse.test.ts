import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { htmlToMarkdown, plainTextToMarkdown } from '../parse';

const docsPage = `<!doctype html>
<html>
  <head><title>Installation — Acme</title></head>
  <body>
    <header><a href="/">Acme</a></header>
    <nav class="sidebar"><a href="/a">Guides</a><a href="/b">API</a></nav>
    <main>
      <h1>Installation</h1>
      <p>Install the CLI before you begin.</p>
      <h2>Docker</h2>
      <pre><code class="language-bash">docker run acme/cli:latest</code></pre>
      <table>
        <tr><th>Flag</th><th>Default</th></tr>
        <tr><td>--port</td><td>3000</td></tr>
      </table>
    </main>
    <footer>© Acme</footer>
  </body>
</html>`;

describe('htmlToMarkdown', () => {
  it('drops navigation, header and footer', () => {
    const { markdown } = htmlToMarkdown(docsPage);
    assert.ok(!markdown.includes('Guides'), 'sidebar links are gone');
    assert.ok(!markdown.includes('© Acme'), 'footer is gone');
    assert.ok(markdown.includes('Install the CLI'), 'the body survives');
  });

  it('keeps heading structure', () => {
    const { markdown } = htmlToMarkdown(docsPage);
    assert.ok(markdown.includes('# Installation'));
    assert.ok(markdown.includes('## Docker'));
  });

  it('keeps the code language on the fence', () => {
    const { markdown } = htmlToMarkdown(docsPage);
    assert.ok(markdown.includes('```bash'), `expected a bash fence, got:\n${markdown}`);
    assert.ok(markdown.includes('docker run acme/cli:latest'));
  });

  it('renders tables as pipe tables rather than a run-on line', () => {
    const { markdown } = htmlToMarkdown(docsPage);
    assert.ok(markdown.includes('| Flag | Default |'), `got:\n${markdown}`);
    assert.ok(markdown.includes('| --port | 3000 |'));
  });

  it('prefers the page heading for the title', () => {
    assert.equal(htmlToMarkdown(docsPage).title, 'Installation');
  });

  it('falls back to the body when there is no main element', () => {
    const { markdown } = htmlToMarkdown('<html><body><p>Just prose.</p></body></html>');
    assert.ok(markdown.includes('Just prose.'));
  });
});

describe('plainTextToMarkdown', () => {
  it('takes the title from the first heading', () => {
    assert.equal(plainTextToMarkdown('# Release notes\n\nStuff.').title, 'Release notes');
  });

  it('falls back to the filename without its extension', () => {
    assert.equal(plainTextToMarkdown('no heading here', 'changelog.txt').title, 'changelog');
  });
});
