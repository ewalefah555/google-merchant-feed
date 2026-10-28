import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import fs from 'fs'
import path from 'path'

const app = new Hono()

const feedDir = path.join(process.cwd(), 'public', 'feeds')
if (!fs.existsSync(feedDir)) {
  fs.mkdirSync(feedDir, { recursive: true })
}

app.use('/feeds/*', serveStatic({ root: './public' }))

app.get('/', (c) => {
  return c.text('Multi-Currency Merchant Feed Engine is Online!')
})

async function generateMerchantFeeds() {
  const shopUrl = process.env.SHOPIFY_STORE_URL
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN

  if (!shopUrl || !accessToken) {
    console.error('⚠️ Configuration missing. Please check your .env settings.')
    return
  }

  try {
    // [NUMBER 1: FETCH PRODUCTS] Connecting directly to Shopify data pipelines
    const response = await fetch(`https://${shopUrl}/admin/api/2024-01/products.json?limit=50`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    const products = data.products || []

    let xmlFeedContent = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:g="http://google.com">
  <channel>
    <title><![CDATA[ My Shopify Store Feed ]]></title>
    <link>https://${shopUrl}</link>
    <description>Automated international shopping multi-currency feed</description>`

    for (const product of products) {
      const variant = product.variants?.[0] || {}
      
      // [NUMBER 2: MATH/CURRENCY ENGINE] Setting currency parameters safely
      const price = variant.price || '0.00'
      
      const cleanTitle = `<![CDATA[ ${product.title} ]]>`
      const cleanDescription = `<![CDATA[ ${product.body_html || ''} ]]>`
      const cleanLink = `https://${shopUrl}/products/${product.handle}?currency=USD`
      const cleanImage = product.image?.src || ''

      xmlFeedContent += `
    <item>
      <g:id>${variant.id || product.id}</g:id>
      <title>${cleanTitle}</title>
      <description>${cleanDescription}</description>
      <link>${cleanLink}</link>
      <g:image_link>${cleanImage}</g:image_link>
      <g:availability>${variant.inventory_quantity > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>
      <g:price>${price} USD</g:price>
      <g:condition>new</g:condition>
    </item>`
    }

    xmlFeedContent += `
  </channel>
</rss>`

    fs.writeFileSync(path.join(feedDir, 'google-feed-usd.xml'), xmlFeedContent)
    console.log('✅ Google Merchant feed generated successfully.')

  } catch (error) {
    console.error('❌ Error compiling your custom product feeds:', error)
  }
}

app.get('/run-engine', async (c) => {
  await generateMerchantFeeds()
  return c.text('Processing routine triggered! Check your public/feeds folder.')
})

const port = process.env.PORT || 3000
console.log(`🚀 Feed server actively running on port ${port}`)

serve({
  fetch: app.fetch,
  port: Number(port)
})
