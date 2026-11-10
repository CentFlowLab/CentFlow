import { isolationFailure, type IsolationEnv } from '../web-isolation';

const ready: IsolationEnv = {
  web: true,
  isolated: false,
  coiScript: true,
  serviceWorker: true,
  controller: false,
  reloads: 0,
};

describe('isolationFailure', () => {
  it('reloads once while the service worker can still take control', () => {
    expect(isolationFailure(ready)).toBe('reload');
  });

  it('explains the in-app browser when isolation cannot be recovered', () => {
    expect(isolationFailure({ ...ready, serviceWorker: false })).toBe('explain');
    expect(isolationFailure({ ...ready, coiScript: false })).toBe('explain');
    expect(isolationFailure({ ...ready, controller: true })).toBe('explain');
    expect(isolationFailure({ ...ready, reloads: 1 })).toBe('explain');
  });

  it('ignores native builds and an already isolated page', () => {
    expect(isolationFailure({ ...ready, web: false })).toBe('ignore');
    expect(isolationFailure({ ...ready, isolated: true })).toBe('ignore');
  });
});
