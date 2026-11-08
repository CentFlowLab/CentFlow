export const BUNDLE_ID = 'app.centflow.mobile';
export const SOURCE_ID = 'app.centflow.source';
export const SOURCE_PATH = 'sideload/source.json';
export const REPO = 'CentFlowLab/CentFlow';
export const SOURCE_URL =
  'https://raw.githubusercontent.com/CentFlowLab/CentFlow/master/sideload/source.json';
export const MIN_IOS = '16.4';

export type SideloadVersion = {
  version: string;
  buildVersion: string;
  date: string;
  localizedDescription: string;
  downloadURL: string;
  size: number;
  minOSVersion: string;
};

export type SideloadApp = {
  name: string;
  bundleIdentifier: string;
  developerName: string;
  subtitle: string;
  localizedDescription: string;
  iconURL: string;
  tintColor: string;
  version?: string;
  downloadURL?: string;
  size?: number;
  versions: SideloadVersion[];
};

export type SideloadSource = {
  name: string;
  identifier: string;
  sourceURL: string;
  nsfw: false;
  apps: [SideloadApp];
  news: [];
};

export function highestBuild(versions: readonly { buildVersion?: string }[]): number {
  return versions.reduce((max, item) => {
    if (!item.buildVersion || !/^[1-9]\d*$/.test(item.buildVersion)) return max;
    return Math.max(max, Number(item.buildVersion));
  }, 0);
}

export function buildsFromTags(tags: readonly string[]): number[] {
  return tags.flatMap((tag) => {
    const match = /^sideload-build-([1-9]\d*)$/.exec(tag);
    return match ? [Number(match[1])] : [];
  });
}

export function nextBuildNumber(source: SideloadSource, tags: readonly string[]): number {
  assertStableIdentity(source);
  const versions = source.apps[0]?.versions ?? [];
  const used = [highestBuild(versions), ...buildsFromTags(tags)];
  return Math.max(...used, 0) + 1;
}

export function releaseTag(buildNumber: number): string {
  if (!Number.isInteger(buildNumber) || buildNumber < 1) {
    throw new Error('O número de compilação tem de ser um inteiro positivo.');
  }
  return `sideload-build-${buildNumber}`;
}

export function releaseDownloadUrl(buildNumber: number): string {
  return `https://github.com/${REPO}/releases/download/${releaseTag(buildNumber)}/centflow-unsigned.ipa`;
}

export function addRelease(
  source: SideloadSource,
  release: { marketingVersion: string; buildNumber: number; date: string; size: number },
): SideloadSource {
  assertStableIdentity(source);
  if (!/^\d+\.\d+\.\d+$/.test(release.marketingVersion)) {
    throw new Error('A versão tem de estar no formato maior.menor.correção.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(release.date)) {
    throw new Error('A data da fonte tem de ser AAAA-MM-DD.');
  }
  if (!Number.isInteger(release.size) || release.size < 1) {
    throw new Error('O tamanho do IPA é inválido.');
  }
  const current = highestBuild(source.apps[0]?.versions ?? []);
  if (release.buildNumber <= current) {
    throw new Error(
      `A compilação ${release.buildNumber} não é superior à ${current}. A fonte não foi alterada.`,
    );
  }
  const buildVersion = String(release.buildNumber);
  const entry: SideloadVersion = {
    version: release.marketingVersion,
    buildVersion,
    date: release.date,
    localizedDescription:
      release.buildNumber === 1
        ? 'Primeira compilação para instalar pelo SideStore.'
        : `Compilação ${buildVersion}. Atualiza por cima da instalação existente e mantém os dados locais.`,
    downloadURL: releaseDownloadUrl(release.buildNumber),
    size: release.size,
    minOSVersion: MIN_IOS,
  };
  const app = source.apps[0];
  if (!app) throw new Error('A fonte só pode publicar app.centflow.mobile.');
  const apps: [SideloadApp] = [
    {
      ...app,
      bundleIdentifier: BUNDLE_ID,
      version: entry.version,
      downloadURL: entry.downloadURL,
      size: entry.size,
      versions: [entry, ...app.versions],
    },
  ];
  return { ...source, apps };
}

function assertStableIdentity(source: SideloadSource): void {
  const app = source.apps[0];
  if (source.identifier !== SOURCE_ID) {
    throw new Error('O identificador da fonte SideStore não pode mudar.');
  }
  if (source.sourceURL !== SOURCE_URL) {
    throw new Error('O URL da fonte SideStore não pode mudar.');
  }
  if (source.apps.length !== 1 || app?.bundleIdentifier !== BUNDLE_ID) {
    throw new Error('A fonte só pode publicar app.centflow.mobile.');
  }
}
