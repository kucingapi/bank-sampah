const TURSO_URL_KEY = 'app:tursoUrl';
const TURSO_TOKEN_KEY = 'app:tursoToken';

export function getTursoConfig(): { url: string; token: string } {
  return {
    url: localStorage.getItem(TURSO_URL_KEY) || '',
    token: localStorage.getItem(TURSO_TOKEN_KEY) || '',
  };
}

export function setTursoConfig(url: string, token: string): void {
  localStorage.setItem(TURSO_URL_KEY, url.trim());
  localStorage.setItem(TURSO_TOKEN_KEY, token.trim());
}
