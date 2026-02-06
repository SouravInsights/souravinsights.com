import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.souravinsights.com'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/api/og'],
        disallow: ['/private/', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
