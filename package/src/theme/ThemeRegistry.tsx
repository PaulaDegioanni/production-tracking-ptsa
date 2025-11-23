// src/theme/ThemeRegistry.tsx
'use client';

import * as React from 'react';
import { CacheProvider } from '@emotion/react';
import createEmotionCache from '@/utils/createEmotionCache';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useServerInsertedHTML } from 'next/navigation';
import { baselightTheme } from '@/theme/DefaultColors';

export default function ThemeRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cache] = React.useState(() => {
    const emotionCache = createEmotionCache();
    // IMPORTANT: this makes Emotion generate consistent classnames on server & client
    emotionCache.compat = true;
    return emotionCache;
  });

  useServerInsertedHTML(() => (
    <style
      data-emotion={`${cache.key} ${Object.keys(cache.inserted).join(' ')}`}
      dangerouslySetInnerHTML={{
        __html: Object.values(cache.inserted).join(' '),
      }}
    />
  ));

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={baselightTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
