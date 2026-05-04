'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Globe,
  ArrowRight,
  Loader2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Maximize2,
  Minimize2,
  Shield,
  Eye,
  Zap,
  X,
  ChevronDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ViewMode = 'live' | 'audit';

interface HistoryItem {
  url: string;
  timestamp: number;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [activeUrl, setActiveUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<ViewMode>('live');
  const [fullscreen, setFullscreen] = useState(false);
  const [pfReady, setPfReady] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const pfIframeRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if PixelForge iframe is ready
  useEffect(() => {
    const checkReady = () => {
      const iframe = pfIframeRef.current;
      if (iframe?.contentWindow) {
        try {
          iframe.contentWindow.postMessage({ type: 'pixelforge-ping' }, '*');
        } catch {
          // cross-origin, will be caught by listener
        }
      }
    };
    const interval = setInterval(checkReady, 2000);
    return () => clearInterval(interval);
  }, []);

  // Listen for PixelForge pong
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'pixelforge-pong') {
        setPfReady(true);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const saveToHistory = useCallback((targetUrl: string) => {
    setHistory((prev) => {
      const newItem: HistoryItem = { url: targetUrl, timestamp: Date.now() };
      return [newItem, ...prev.filter((h) => h.url !== targetUrl)].slice(0, 20);
    });
  }, []);

  const normalizeUrl = (input: string): string => {
    let normalized = input.trim();
    if (!normalized) return '';
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = 'https://' + normalized;
    }
    return normalized;
  };

  const handleGo = useCallback(async () => {
    const targetUrl = normalizeUrl(url);
    if (!targetUrl) return;

    try {
      new URL(targetUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setError('');
    setLoading(true);
    setActiveUrl(targetUrl);
    saveToHistory(targetUrl);

    const iframe = pfIframeRef.current;

    if (mode === 'live') {
      // Live mode: tell PixelForge to load the URL directly in its preview iframe
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          { type: 'pixelforge-live-url', url: targetUrl },
          '*'
        );
      }
      setLoading(false);
    } else {
      // Audit mode: fetch HTML via server-side proxy, then send to PixelForge for scoring
      try {
        const res = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl }),
        });
        const data = await res.json();

        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        const html = data.html || '';
        if (html && iframe?.contentWindow) {
          iframe.contentWindow.postMessage(
            { type: 'pixelforge-import', html },
            '*'
          );
        }
      } catch {
        setError('Failed to fetch the page. Please try again.');
      }
      setLoading(false);
    }
  }, [url, mode, saveToHistory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGo();
    }
  };

  const handleRefresh = () => {
    if (activeUrl) {
      handleGo();
    }
  };

  const openInNewTab = () => {
    if (activeUrl) {
      window.open(activeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const extractDomain = (targetUrl: string) => {
    try {
      return new URL(targetUrl).hostname;
    } catch {
      return targetUrl;
    }
  };

  return (
    <TooltipProvider>
      <div
        className={`flex flex-col bg-background transition-all duration-300 ${
          fullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'
        }`}
      >
        {/* Top Bar */}
        <div
          className={`border-b bg-card shadow-sm transition-all duration-300 ${
            fullscreen ? '' : 'sticky top-0 z-40'
          }`}
        >
          <div className="px-4 py-2.5">
            {/* Title + URL Row */}
            <div className="flex items-center gap-3">
              {/* Logo */}
              {!fullscreen && (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-500">
                    <Globe className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="text-sm font-bold hidden md:inline">PixelForge</span>
                </div>
              )}

              {!fullscreen && <Separator orientation="vertical" className="h-6" />}

              {/* URL Bar */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="relative flex-1 min-w-0">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Enter a URL (e.g. example.com)"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-9 pr-4 h-9 text-sm"
                  />
                </div>

                <Button
                  onClick={handleGo}
                  disabled={loading || !url.trim()}
                  className="h-9 px-4 gap-2 shrink-0"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Go</span>
                </Button>

                {/* Mode Toggle */}
                <div className="flex items-center rounded-lg border bg-muted p-0.5 shrink-0">
                  <button
                    onClick={() => setMode('live')}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      mode === 'live'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Eye className="h-3 w-3" />
                    Live
                  </button>
                  <button
                    onClick={() => setMode('audit')}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      mode === 'audit'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Zap className="h-3 w-3" />
                    Audit
                  </button>
                </div>

                <Separator orientation="vertical" className="h-6 hidden sm:block" />

                {/* Action Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleRefresh}
                        disabled={!activeUrl || loading}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={openInNewTab}
                        disabled={!activeUrl}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Open in new tab</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setFullscreen(!fullscreen)}
                      >
                        {fullscreen ? (
                          <Minimize2 className="h-4 w-4" />
                        ) : (
                          <Maximize2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Status Row */}
            {activeUrl && (
              <div className="mt-1.5 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  {extractDomain(activeUrl)}
                </Badge>
                <Badge variant="outline" className="text-xs gap-1">
                  {mode === 'live' ? (
                    <><Eye className="h-3 w-3" /> Live Preview</>
                  ) : (
                    <><Shield className="h-3 w-3" /> Server Proxy + Audit</>
                  )}
                </Badge>
                {loading && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {mode === 'live' ? 'Loading...' : 'Fetching & scoring...'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2">
            <div className="flex items-center gap-2 max-w-7xl mx-auto">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive flex-1">{error}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setError('')}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* PixelForge iframe - takes up the rest of the space */}
        <div className="flex-1 relative">
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {mode === 'live'
                    ? 'Loading page preview...'
                    : 'Fetching page & running audit...'}
                </p>
              </div>
            </div>
          )}

          <iframe
            ref={pfIframeRef}
            src="/pixelforge.html"
            className="w-full h-full border-0"
            style={{ minHeight: fullscreen ? '100vh' : 'calc(100vh - 100px)' }}
            title="PixelForge - Page Audit Tool"
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
