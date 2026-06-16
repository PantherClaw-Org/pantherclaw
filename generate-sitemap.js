import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Read .env file manually
const envPath = path.resolve(process.cwd(), '.env');
let VITE_SUPABASE_URL = '';
let VITE_SUPABASE_ANON_KEY = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  VITE_SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL="(.*?)"/)?.[1] || '';
  VITE_SUPABASE_ANON_KEY = envContent.match(/VITE_SUPABASE_ANON_KEY="(.*?)"/)?.[1] || '';
}

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
  console.warn("Missing Supabase credentials in .env, skipping sitemap dynamic generation.");
  process.exit(0);
}

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

const STATIC_URLS = [
  { loc: 'https://pantherclaw.in/', changefreq: 'weekly', priority: '1.0' },
  { loc: 'https://pantherclaw.in/shop', changefreq: 'daily', priority: '0.9' },
  { loc: 'https://pantherclaw.in/story', changefreq: 'monthly', priority: '0.6' },
  { loc: 'https://pantherclaw.in/contact', changefreq: 'yearly', priority: '0.4' },
  { loc: 'https://pantherclaw.in/shipping-policy', changefreq: 'yearly', priority: '0.3' },
  { loc: 'https://pantherclaw.in/exchanges', changefreq: 'yearly', priority: '0.3' },
  { loc: 'https://pantherclaw.in/privacy', changefreq: 'yearly', priority: '0.3' },
  { loc: 'https://pantherclaw.in/terms', changefreq: 'yearly', priority: '0.3' },
];

async function generateSitemap() {
  console.log("Generating sitemap.xml...");
  
  // Fetch active products
  const { data: products, error } = await supabase
    .from('products')
    .select('slug, updated_at')
    .eq('is_active', true);

  if (error) {
    console.error("Error fetching products for sitemap:", error);
    process.exit(1);
  }

  const urls = [...STATIC_URLS];

  // Add product URLs
  for (const product of products) {
    if (product.slug) {
      urls.push({
        loc: `https://pantherclaw.in/product/${product.slug}`,
        changefreq: 'weekly',
        priority: '0.8',
        lastmod: product.updated_at ? new Date(product.updated_at).toISOString().split('T')[0] : null
      });
    }
  }

  // Generate XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  for (const url of urls) {
    xml += `  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
${url.lastmod ? `    <lastmod>${url.lastmod}</lastmod>\n` : ''}  </url>
`;
  }

  xml += `</urlset>`;

  const sitemapPath = path.resolve(process.cwd(), 'public', 'sitemap.xml');
  fs.writeFileSync(sitemapPath, xml, 'utf-8');
  console.log(`Successfully generated sitemap.xml with ${urls.length} total URLs.`);
}

generateSitemap();
