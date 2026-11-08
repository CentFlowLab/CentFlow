import {
  BUNDLE_ID,
  SOURCE_ID,
  SOURCE_URL,
  addRelease,
  buildsFromTags,
  highestBuild,
  nextBuildNumber,
  type SideloadSource,
} from '../sideload-source';

function source(builds: string[] = []): SideloadSource {
  return {
    name: 'CentFlow',
    identifier: SOURCE_ID,
    sourceURL: SOURCE_URL,
    nsfw: false,
    apps: [
      {
        name: 'CentFlow',
        bundleIdentifier: BUNDLE_ID,
        developerName: 'CentFlow',
        subtitle: 'O teu dinheiro, sob controlo.',
        localizedDescription: 'Descrição',
        iconURL: 'https://example.test/icon.png',
        tintColor: '#4B45E6',
        versions: builds.map((buildVersion) => ({
          version: '0.1.0',
          buildVersion,
          date: '2026-11-01',
          localizedDescription: 'Anterior',
          downloadURL: `https://example.test/${buildVersion}.ipa`,
          size: 10,
          minOSVersion: '16.4',
        })),
      },
    ],
    news: [],
  };
}

describe('sideload source versions', () => {
  it('starts at build 1 and then always uses the next integer', () => {
    expect(nextBuildNumber(source(), [])).toBe(1);
    expect(nextBuildNumber(source(['1', '2']), [])).toBe(3);
    expect(highestBuild([{ buildVersion: '4' }, { buildVersion: 'não' }])).toBe(4);
  });

  it('does not reuse a build number that already has a GitHub release', () => {
    expect(buildsFromTags(['v1.0.0', 'sideload-build-5', 'sideload-build-x'])).toEqual([5]);
    expect(nextBuildNumber(source(['2']), ['sideload-build-5'])).toBe(6);
  });

  it('publishes a newer build of the same app without dropping previous versions', () => {
    const updated = addRelease(source(['1']), {
      marketingVersion: '0.1.0',
      buildNumber: 2,
      date: '2026-11-08',
      size: 2048,
    });
    expect(updated.apps[0].bundleIdentifier).toBe(BUNDLE_ID);
    expect(updated.apps[0].versions.map((item) => item.buildVersion)).toEqual(['2', '1']);
    expect(updated.apps[0].version).toBe('0.1.0');
    expect(updated.apps[0].versions[0]).toMatchObject({
      version: '0.1.0',
      buildVersion: '2',
      size: 2048,
      minOSVersion: '16.4',
    });
  });

  it('refuses to replace the bundle identifier or repeat a build', () => {
    const changed = source();
    changed.apps[0].bundleIdentifier = 'app.other';
    expect(() => nextBuildNumber(changed, [])).toThrow(/app\.centflow\.mobile/);
    expect(() =>
      addRelease(source(['2']), {
        marketingVersion: '0.1.0',
        buildNumber: 2,
        date: '2026-11-08',
        size: 10,
      }),
    ).toThrow(/não é superior/);
  });

  it('keeps the newest build first when a release number was skipped', () => {
    const updated = addRelease(source(['1']), {
      marketingVersion: '0.2.0',
      buildNumber: 4,
      date: '2026-11-08',
      size: 30,
    });
    expect(updated.apps[0].versions.map((item) => item.buildVersion)).toEqual(['4', '1']);
    expect(updated.apps[0]?.versions[0]?.version).toBe('0.2.0');
  });
});
