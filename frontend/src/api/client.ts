const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api(path: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...((init?.headers as Record<string, string> | undefined) || {}),
    },
    ...init,
  });
  if (!response.ok) throw new Error((await response.json()).message || 'Erreur API');
  return response.json();
}
