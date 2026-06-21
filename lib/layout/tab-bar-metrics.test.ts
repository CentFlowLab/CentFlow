import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveTabBarBottomInset,
  TAB_BAR_ANDROID_NAV_BUFFER,
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

test('resolveTabBarBottomInset usa gap screen-window no Android', () => {
  assert.equal(
    resolveTabBarBottomInset({
      platform: 'android',
      insetsBottom: 0,
      screenHeight: 800,
      windowHeight: 752,
    }),
    48 + TAB_BAR_ANDROID_NAV_BUFFER,
  );
});

test('resolveTabBarBottomInset prefere insets.bottom quando maior que gap', () => {
  assert.equal(
    resolveTabBarBottomInset({
      platform: 'android',
      insetsBottom: 48,
      screenHeight: 800,
      windowHeight: 776,
    }),
    48 + TAB_BAR_ANDROID_NAV_BUFFER,
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
    TAB_BAR_MIN_BOTTOM_INSET_ANDROID,
  );
});

test('resolveTabBarBottomInset não usa constante fixa 64px', () => {
  const inset = resolveTabBarBottomInset({
    platform: 'android',
    insetsBottom: 24,
    screenHeight: 800,
    windowHeight: 776,
  });
  assert.equal(inset, 24 + TAB_BAR_ANDROID_NAV_BUFFER);
  assert.notEqual(inset, 64);
});
