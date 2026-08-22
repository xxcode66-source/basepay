/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security headers — HSTS, XSS protection, etc.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Stub out modules that are referenced but don't exist in installed packages.
    // These are pulled in via deep transitive deps (wagmi → @wagmi/connectors →
    // @base-org/account → @coinbase/cdp-sdk) but are never exercised at runtime
    // in a browser wallet-connection context.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@x402/evm/upto/client': false,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };
    return config;
  },
};

export default nextConfig;
