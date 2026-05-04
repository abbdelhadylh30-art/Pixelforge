import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Only HTTP and HTTPS URLs are allowed' }, { status: 400 });
    }

    // Fetch the page
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    const html = await response.text();

    // Rewrite URLs to absolute so they work in srcdoc iframe
    const baseUrl = parsedUrl.origin;
    // The page's path directory (for resolving relative URLs like "style.css")
    const pagePath = parsedUrl.pathname.endsWith('/')
      ? parsedUrl.pathname
      : parsedUrl.pathname.substring(0, parsedUrl.pathname.lastIndexOf('/') + 1);
    const pageDir = baseUrl + pagePath;

    let rewrittenHtml = html;

    // 1. Rewrite root-relative URLs: /path → https://domain/path
    rewrittenHtml = rewrittenHtml
      .replace(
        /(<(?:img|script|iframe|embed|video|audio|source|link)\s[^>]*src=["'])(\/[^"']*)(["'])/gi,
        `$1${baseUrl}$2$3`
      )
      .replace(
        /(<(?:a|link)\s[^>]*href=["'])(\/[^"']*)(["'])/gi,
        `$1${baseUrl}$2$3`
      );

    // 2. Rewrite relative URLs that DON'T start with / or http:
    //    e.g. src="style.css" → src="https://domain/path/style.css"
    //    e.g. href="news.css" → href="https://domain/path/news.css"
    rewrittenHtml = rewrittenHtml
      .replace(
        /(<(?:img|script|iframe|embed|video|audio|source|link)\s[^>]*src=["'])((?!https?:\/\/|\/\/|data:|blob:|#|javascript:)[^"']+)(["'])/gi,
        `$1${pageDir}$2$3`
      )
      .replace(
        /(<(?:a|link)\s[^>]*href=["'])((?!https?:\/\/|\/\/|data:|blob:|#|javascript:|mailto:|tel:)[^"']+)(["'])/gi,
        `$1${pageDir}$2$3`
      );

    // 3. Add a <base> tag as fallback for anything we missed
    if (!rewrittenHtml.includes('<base ')) {
      rewrittenHtml = rewrittenHtml.replace(
        /<head([^>]*)>/i,
        `<head$1><base href="${pageDir}">`
      );
    }

    return NextResponse.json({
      html: rewrittenHtml,
      contentType,
      status: response.status,
      finalUrl: response.url,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch the page';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
