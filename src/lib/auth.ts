const TOKEN_KEY = "rule24_access_token";
const SUBSCRIPTION_CARD_KEY = "rule24_subscription_card_attached";

export function getAccessToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}

export function isSubscriptionCardAttached(): boolean {
  return window.localStorage.getItem(SUBSCRIPTION_CARD_KEY) === "1";
}

export function setSubscriptionCardAttached(attached: boolean): void {
  window.localStorage.setItem(SUBSCRIPTION_CARD_KEY, attached ? "1" : "0");
}
