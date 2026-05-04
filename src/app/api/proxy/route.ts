import { NextRequest, NextResponse } from 'next/server';

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

    // Rewrite relative URLs to absolute
    const baseUrl = parsedUrl.origin;
    const rewrittenHtml = html
      // Rewrite src attributes with relative paths
      .replace(
        /(<(?:img|script|iframe|embed|video|audio|source|link)\s[^>]*src=["'])(\/[^"']*)(["'])/gi,
        `$1${baseUrl}$2$3`
      )
      // Rewrite href attributes with relative paths
      .replace(
        /(<(?:a|link)\s[^>]*href=["'])(\/[^"']*)(["'])/gi,
        `$1${baseUrl}$2$3`
      );

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
