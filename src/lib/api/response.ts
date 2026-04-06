import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function success<T>(data: T, meta?: ApiResponse['meta']) {
  return NextResponse.json<ApiResponse<T>>({ data, error: null, meta });
}

export function error(message: string, status: number = 400) {
  return NextResponse.json<ApiResponse>({ data: null, error: message }, { status });
}
