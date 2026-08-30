/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      // Guide consolidation, August 2026. The comparison pages were merged into
      // the main guides so each topic has one recommendation page and one
      // reference page, rather than three competing for the same searches.
      {
        source: '/guides/weapons-compared',
        destination: '/guides/weapons',
        permanent: true,
      },
      {
        source: '/guides/vehicles-compared',
        destination: '/guides/vehicles',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
