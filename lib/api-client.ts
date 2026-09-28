'use client';

import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';

export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;

  constructor(status: number, body: Record<string, unknown>) {
    super(typeof body.error === 'string' ? body.error : `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function waitForAuth(): Promise<User | null> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = await waitForAuth();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (user) headers.set('Authorization', `Bearer ${await user.getIdToken()}`);

  const response = await fetch(path, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}
