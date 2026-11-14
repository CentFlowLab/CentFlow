/**
 * Endereços de miven.pt com a versão do conteúdo (`?v=<hash>`), para o browser nunca juntar um HTML
 * novo com um CSS, imagem ou fonte antigos (o Pages guarda os ficheiros 10 minutos em cache). A
 * versão é o início do SHA-256 de cada ficheiro: o que não mudou mantém o mesmo endereço.
 * Usado no passo "Endereços com a versão publicada" de `.github/workflows/site.yml`.
 */

export const VERSIONED_EXTENSIONS = ['css', 'js', 'png', 'webp', 'jpg', 'svg', 'woff2'] as const;

// Um endereço local de /assets/ entre aspas, espaços, vírgulas (srcset) ou parênteses (url() do
// CSS). Endereços absolutos (https://miven.pt/assets/og.png, para as redes sociais) ficam como estão.
const ASSET_REF = new RegExp(
  `(?<=["'\\s,(])(/assets/[A-Za-z0-9/_.-]+\\.(?:${VERSIONED_EXTENSIONS.join('|')}))(?=["'\\s,)])`,
  'g',
);

/** Lista os endereços de /assets/ que um HTML ou CSS referencia (sem repetições). */
export function assetRefs(text: string): string[] {
  return [...new Set(text.match(ASSET_REF) ?? [])];
}

/**
 * Acrescenta `?v=<versão>` a cada endereço de /assets/. `versionOf` devolve a versão do ficheiro,
 * ou `null` se não existir (o endereço fica como está e quem chama decide se é erro).
 */
export function versionAssetRefs(text: string, versionOf: (ref: string) => string | null): string {
  return text.replace(ASSET_REF, (ref) => {
    const version = versionOf(ref);
    return version ? `${ref}?v=${version}` : ref;
  });
}
