'use client';
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    window.location.href = '/pixelforge.html';
  }, []);
  return <p>Redirecting to PixelForge...</p>;
}
