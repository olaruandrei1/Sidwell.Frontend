import type { ApiError } from '../api/types';

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function fail<T = never>(error: ApiError): Result<T> {
  return { ok: false, error };
}

export function isOk<T>(res: Result<T>): res is { ok: true; data: T } {
  return res.ok;
}

export function isFail<T>(res: Result<T>): res is { ok: false; error: ApiError } {
  return !res.ok;
}
