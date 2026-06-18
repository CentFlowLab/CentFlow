export { checkForUpdates, type UpdateCheckResult } from './checkForUpdates';
export {
  applyUpdateSafely,
  reloadIfUpdatePending,
  setCriticalActionInProgress,
  type ApplyUpdateResult,
} from './applyUpdateSafely';
export {
  getUpdateStatus,
  setUpdateStatus,
  subscribeUpdateStatus,
  type UpdateStatus,
} from './updateStatus';
