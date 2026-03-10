import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BLOCKED_COUNTRIES = new Set(['RU', 'BY', 'RUS', 'BLR']);

export function middleware(request: NextRequest) {
  const countryHeader =
    request.headers.get('x-vercel-ip-country') ??
    request.headers.get('x-country') ??
    '';

  const country = countryHeader.toUpperCase();

  // Если страна Россия или Беларусь — перенаправляем на /blocked
  if (BLOCKED_COUNTRIES.has(country)) {
    const url = request.nextUrl.clone();
    url.pathname = '/blocked';
    url.search = '';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/|blocked|api/telegram|api/health|favicon.ico|robots.txt).*)',
  ],
};

