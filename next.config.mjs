/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/",
        destination: "/curated-links",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
