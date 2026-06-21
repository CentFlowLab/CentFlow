import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ANDROID_TAB_BAR_INSET_MAX,
  ANDROID_TAB_BAR_INSET_MIN,
  resolveTabBarBottomInset,
  TAB_BAR_MIN_BOTTOM_INSET_ANDROID,
} from '@/lib/layout/tab-bar-metrics';

test('resolveTabBarBottomInset usa insets.bottom no iOS', () => {
  assert.equal(
    resolveTabBarBottomInset({
      platform: 'ios',
      insetsBottom: 34,
      screenHeight: 844,
      windowHeight: 844,
    }),
    34,
  );
});

test('resolveTabBarBottomInset faz clamp no Android com inset grande', () => {
  assert.equal(
    resolveTabBarBottomInset({
      platform: 'android',
      insetsBottom: 0,
      screenHeight: 800,
      windowHeight: 752,
    }),
    ANDROID_TAB_BAR_INSET_MAX,
  );
});

test('resolveTabBarBottomInset prefere insets.bottom quando moderado', () => {
  assert.equal(
    resolveTabBarBottomInset({
      platform: 'android',
      insetsBottom: 16,
      screenHeight: 800,
      windowHeight: 784,
    }),
    16,
  );
});

test('resolveTabBarBottomInset fallback mínimo quando sem medição', () => {
  assert.equal(
    resolveTabBarBottomInset({
      platform: 'android',
      insetsBottom: 0,
      screenHeight: 800,
      windowHeight: 800,
    }),
    ANDROID_TAB_BAR_INSET_MIN,
  );
});

test('resolveTabBarBottomInset não usa constante fixa 64px', () => {
  const inset = resolveTabBarBottomInset({
    platform: 'android',
    insetsBottom: 48,
    screenHeight: 800,
    windowHeight: 752,
  });
  assert.equal(inset, ANDROID_TAB_BAR_INSET_MAX);
  assert.notEqual(inset, 64);
});

test('TAB_BAR_MIN_BOTTOM_INSET_ANDROID alias', () => {
  assert.equal(TAB_BAR_MIN_BOTTOM_INSET_ANDROID, 12);
});
