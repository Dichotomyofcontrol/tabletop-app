// Map Firebase auth error codes / messages to user-friendly text.
const FRIENDLY: Record<string, string> = {
  'auth/user-not-found': "We couldn't find an account with that email.",
  'auth/wrong-password': 'That password isn\'t right.',
  'auth/invalid-credential': "Email or password isn't right.",
  'auth/invalid-login-credentials': "Email or password isn't right.",
  'auth/email-already-in-use': 'An account with that email already exists.',
  'auth/weak-password': 'Pick a longer password — at least 8 characters.',
  'auth/invalid-email': 'That doesn\'t look like a valid email.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/user-disabled': 'That account has been disabled.',
  'auth/network-request-failed': 'Network hiccup. Check your connection and try again.',
  'auth/missing-password': 'Enter your password.',
};

export function friendlyAuthError(raw: string): string {
  const stripped = raw.replace(/^Firebase:\s*/, '').trim();
  // Try to extract the (auth/foo) code if present
  const codeMatch = stripped.match(/\((auth\/[a-z-]+)\)/);
  if (codeMatch && FRIENDLY[codeMatch[1]]) return FRIENDLY[codeMatch[1]];
  // Or matches by exact code key if message is just the code
  if (FRIENDLY[stripped]) return FRIENDLY[stripped];
  // Strip the trailing (auth/...) noise from anything else
  return stripped.replace(/\s*\(auth\/[a-z-]+\)\.?$/, '').replace(/^Error:\s*/, '');
}
