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
  images: {
    domains: ["assets.literal.club", "books.google.com"],
  },
};

export default nextConfig;
