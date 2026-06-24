import { NextResponse } from 'next/server';

export function ok<T>(data: T) { return NextResponse.json(data); }

export function fail(error: unknown, status = 400, extra?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : 'Unexpected error';
  return NextResponse.json({ ...extra, error: message }, { status });
}
