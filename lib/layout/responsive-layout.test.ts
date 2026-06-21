import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ANDROID_NAV_BAR_INSET_MAX,
  ANDROID_TAB_BAR_GESTURE_MAX,
  ANDROID_TAB_BAR_INSET_MAX,
  ANDROID_TAB_BAR_INSET_MIN,
  ANDROID_THREE_BUTTON_THRESHOLD,
  resolveBottomActionPadding,
  resolveEffectiveBottomInset,
  resolveModalBottomPadding,
  resolveNavigationBarInset,
  resolveSheetBottomPadding,
  resolveSystemNavigationGap,
  resolveTabBarBottomInset,
  type SafeAreaInput,
} from '@/lib/layout/safe-area';

type Scenario = SafeAreaInput & { label: string };

/** Conjuntos representativos — sem checks por modelo, só pela magnitude do inset. */
const SCENARIOS: Scenario[] = [
  {
    label: 'Android 3 botões (inset grande)',
    platform: 'android',
    insetsBottom: 48,
    screenHeight: 2400,
    windowHeight: 2352,
  },
  {
    label: 'Android gestos (pill)',
    platform: 'android',
    insetsBottom: 24,
    screenHeight: 2400,
    windowHeight: 2376,
  },
  {
    label: 'Android gestos fino',
    platform: 'android',
    insetsBottom: 16,
    screenHeight: 2340,
    windowHeight: 2324,
  },
  {
    label: 'Samsung Galaxy A12 — inset 0, gap reporta nav bar',
    platform: 'android',
    insetsBottom: 0,
    screenHeight: 1600,
    windowHeight: 1552,
  },
  {
    label: 'Samsung Galaxy A12 — inset moderado inflacionado',
    platform: 'android',
    insetsBottom: 24,
    screenHeight: 1600,
    windowHeight: 1500,
  },
  {
    label: 'Pixel-like (gestos)',
    platform: 'android',
    insetsBottom: 24,
    screenHeight: 2992,
    windowHeight: 2968,
  },
  {
    label: 'Tablet Android (gestos)',
    platform: 'android',
    insetsBottom: 20,
    screenHeight: 2000,
    windowHeight: 1980,
  },
  {
    label: 'iOS com home indicator',
    platform: 'ios',
    insetsBottom: 34,
    screenHeight: 2778,
    windowHeight: 2778,
  },
  {
    label: 'iOS sem bottom inset',
    platform: 'ios',
    insetsBottom: 0,
    screenHeight: 1334,
    windowHeight: 1334,
  },
];

test('tab bar: inset pequeno (gestos) fica justo, não demasiado subida', () => {
  for (const scenario of SCENARIOS.filter(
    (s) => s.platform === 'android' && resolveSystemNavigationGapRaw(s) === false,
  )) {
    const tab = resolveTabBarBottomInset(scenario);
    assert.ok(
      tab <= ANDROID_TAB_BAR_GESTURE_MAX,
      `${scenario.label}: tab inset ${tab} deve ser ≤ ${ANDROID_TAB_BAR_GESTURE_MAX}`,
    );
  }
});

test('tab bar: inset grande (3 botões) usa clearance total, não fica colada', () => {
  const threeButton = SCENARIOS.find(
    (s) => s.label.startsWith('Android 3 botões'),
  )!;
  const tab = resolveTabBarBottomInset(threeButton);
  assert.equal(tab, 48);
  assert.ok(tab >= ANDROID_THREE_BUTTON_THRESHOLD);
});

test('tab bar: A12 com inset 0 + gap usa o gap como nav bar real', () => {
  const a12 = SCENARIOS.find((s) => s.label.includes('inset 0, gap'))!;
  // gap = 48 → tratado como 3 botões → clearance total
  assert.equal(resolveTabBarBottomInset(a12), 48);
  assert.equal(resolveNavigationBarInset(a12), 48);
});

test('tab bar: A12 com inset moderado não inflaciona pelo gap (≤ gesto máx)', () => {
  const a12 = SCENARIOS.find((s) => s.label.includes('moderado inflacionado'))!;
  // prefere insets.bottom (24), ignora gap inflacionado → clamp gesto
  assert.equal(resolveTabBarBottomInset(a12), ANDROID_TAB_BAR_GESTURE_MAX);
});

test('tab bar: inset sempre dentro de [MIN, MAX] no Android', () => {
  for (const scenario of SCENARIOS.filter((s) => s.platform === 'android')) {
    const tab = resolveTabBarBottomInset(scenario);
    assert.ok(
      tab >= ANDROID_TAB_BAR_INSET_MIN && tab <= ANDROID_TAB_BAR_INSET_MAX,
      `${scenario.label}: tab inset ${tab} fora de [${ANDROID_TAB_BAR_INSET_MIN}, ${ANDROID_TAB_BAR_INSET_MAX}]`,
    );
  }
});

test('nav bar inset: nunca acima do máximo e cobre 3 botões', () => {
  for (const scenario of SCENARIOS.filter((s) => s.platform === 'android')) {
    const nav = resolveNavigationBarInset(scenario);
    assert.ok(nav <= ANDROID_NAV_BAR_INSET_MAX);
  }
  const threeButton = SCENARIOS.find((s) =>
    s.label.startsWith('Android 3 botões'),
  )!;
  assert.equal(resolveNavigationBarInset(threeButton), 48);
});

test('iOS usa insets.bottom diretamente (com e sem indicador)', () => {
  const withIndicator = SCENARIOS.find((s) => s.label === 'iOS com home indicator')!;
  const without = SCENARIOS.find((s) => s.label === 'iOS sem bottom inset')!;

  assert.equal(resolveTabBarBottomInset(withIndicator), 34);
  assert.equal(resolveNavigationBarInset(withIndicator), 34);
  assert.equal(resolveEffectiveBottomInset(withIndicator), 34);

  assert.equal(resolveTabBarBottomInset(without), 0);
  assert.equal(resolveNavigationBarInset(without), 0);
});

test('effectiveBottomInset == navigationBarInset (clearance fiável)', () => {
  for (const scenario of SCENARIOS) {
    assert.equal(
      resolveEffectiveBottomInset(scenario),
      resolveNavigationBarInset(scenario),
      scenario.label,
    );
  }
});

test('sheets/modais/botões fixos garantem clearance acima da nav bar', () => {
  for (const scenario of SCENARIOS.filter((s) => s.platform === 'android')) {
    const nav = resolveNavigationBarInset(scenario);
    assert.ok(
      resolveSheetBottomPadding(nav) >= nav,
      `${scenario.label}: sheet padding deve cobrir nav bar`,
    );
    assert.ok(
      resolveModalBottomPadding(nav) >= nav,
      `${scenario.label}: modal padding deve cobrir nav bar`,
    );
    assert.ok(
      resolveBottomActionPadding(nav) >= nav,
      `${scenario.label}: botão fixo deve cobrir nav bar`,
    );
  }
});

test('systemNavigationGap reflete screen − window', () => {
  assert.equal(
    resolveSystemNavigationGap({
      platform: 'android',
      insetsBottom: 0,
      screenHeight: 1600,
      windowHeight: 1552,
    }),
    48,
  );
  assert.equal(
    resolveSystemNavigationGap({
      platform: 'ios',
      insetsBottom: 34,
      screenHeight: 2778,
      windowHeight: 2778,
    }),
    0,
  );
});

/** True quando o cenário tem um inset reportado considerado "grande" (3 botões). */
function resolveSystemNavigationGapRaw(scenario: SafeAreaInput): boolean {
  const raw =
    scenario.insetsBottom > 0
      ? scenario.insetsBottom
      : Math.max(0, scenario.screenHeight - scenario.windowHeight);
  return raw >= ANDROID_THREE_BUTTON_THRESHOLD;
}
