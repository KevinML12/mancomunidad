export const SESSION_COOKIE = 'mfn_session';

export function sessionTokenFromCookie(header = '') {
  const item = header.split(';').map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`));
  return item ? item.slice(SESSION_COOKIE.length + 1) : null;
}

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 12 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}
