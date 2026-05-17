export const decodeJwtPayload = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const binary = typeof atob === 'function'
      ? atob(padded)
      : typeof Buffer !== 'undefined'
        ? Buffer.from(padded, 'base64').toString('binary')
        : '';
    if (!binary) return null;
    const json = decodeURIComponent(
      Array.prototype.map.call(
        binary,
        (c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`
      ).join('')
    );
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};

export const isJwtExpired = (token, skewSeconds = 30) => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return Date.now() >= (payload.exp * 1000) - (skewSeconds * 1000);
};
