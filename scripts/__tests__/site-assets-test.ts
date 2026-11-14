import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

import { assetRefs, versionAssetRefs } from '../site-assets';

const SITE = join(cwd(), 'site');

function exists(path: string): boolean {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
}

function entries(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return []; // um ficheiro (ex.: CNAME), não uma pasta
  }
}

function pages(dir: string): string[] {
  return entries(dir).flatMap((name) => {
    const path = join(dir, name);
    if (path === join(SITE, 'app')) return [];
    if (name.endsWith('.html') || (name.endsWith('.css') && dir.endsWith('assets'))) return [path];
    return pages(path);
  });
}

describe('site assets', () => {
  it('versions local assets in src, srcset, href and url(), and leaves absolute URLs alone', () => {
    const html = [
      '<link rel="stylesheet" href="/assets/home.css" />',
      '<img src="/assets/logo-56.png" srcset="/assets/logo-56.png 2x, /assets/logo-84.png 3x" />',
      '<meta property="og:image" content="https://miven.pt/assets/og.png" />',
      "src: url('/assets/fonts/inter-latin-400.woff2') format('woff2');",
      '<a href="/app/">Entrar</a>',
    ].join('\n');
    const out = versionAssetRefs(html, (ref) => `h${ref.length}`);
    expect(out).toContain('href="/assets/home.css?v=h16"');
    expect(out).toContain('srcset="/assets/logo-56.png?v=h19 2x, /assets/logo-84.png?v=h19 3x"');
    expect(out).toContain('content="https://miven.pt/assets/og.png"');
    expect(out).toContain("url('/assets/fonts/inter-latin-400.woff2?v=h");
    expect(out).toContain('href="/app/"');
  });

  it('keeps a reference without a file as it is', () => {
    expect(versionAssetRefs('<img src="/assets/x.png" />', () => null)).toBe(
      '<img src="/assets/x.png" />',
    );
  });

  it('every asset referenced by the site exists', () => {
    const missing = pages(SITE).flatMap((file) =>
      assetRefs(readFileSync(file, 'utf8'))
        .filter((ref) => !exists(join(SITE, ref)))
        .map((ref) => `${file}: ${ref}`),
    );
    expect(missing).toEqual([]);
  });

  it('the install page falls back to the version in app.json', () => {
    // O workflow substitui-a na publicação; esta verificação evita um valor esquecido no código.
    const version = JSON.parse(readFileSync(join(SITE, '..', 'app.json'), 'utf8')).expo.version;
    const html = readFileSync(join(SITE, 'experimentar', 'index.html'), 'utf8');
    expect(html).toContain(`<span data-app-version>${version}</span>`);
  });
});
