let logoutInProgress = false;

export function beginLogout() {
  logoutInProgress = true;
}

export function finishLogout() {
  logoutInProgress = false;
}

export function isLogoutInProgress() {
  return logoutInProgress;
}
