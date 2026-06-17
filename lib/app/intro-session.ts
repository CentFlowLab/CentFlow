let introDoneThisSession = false;

export function hasIntroCompletedThisSession(): boolean {
  return introDoneThisSession;
}

export function markIntroCompletedThisSession(): void {
  introDoneThisSession = true;
}

export function resetIntroSessionForDev(): void {
  introDoneThisSession = false;
}
