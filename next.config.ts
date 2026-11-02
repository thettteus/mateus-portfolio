import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

const nextConfig = (phase: string): NextConfig => ({
  // A production build must not overwrite the running dev server's chunks.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
});

export default nextConfig;
