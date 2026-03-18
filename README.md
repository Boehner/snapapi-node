# snapapi

Official Node.js and TypeScript SDK for the [SnapAPI](https://snapapi.tech) web intelligence API.

```bash
npm install snapapi
```

Zero runtime dependencies. Node.js 18+ required.

---

## Quick Start

```typescript
import SnapAPI from 'snapapi';

const client = new SnapAPI(); // reads SNAPAPI_KEY from env
// or: new SnapAPI('snap_yourkey')

// Screenshot
const png = await client.screenshot('https://github.com', { full_page: true });
fs.writeFileSync('github.png', png);

// Metadata
const meta = await client.metadata('https://github.com');
console.log(meta.og_title);   // "GitHub: Let's build from here"
console.log(meta.og_image);   // "https://..."

// Full page analysis
const page = await client.analyze('https://stripe.com');
console.log(page.page_type);    // "product landing page"
console.log(page.primary_cta);  // "Start now"
console.log(page.technologies); // ["React", "Next.js", "Cloudflare"]
```

---

## API Reference

### `new SnapAPI(apiKey?, timeout?)`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `process.env.SNAPAPI_KEY` | Your SnapAPI API key |
| `timeout` | `number` | `45000` | Request timeout in milliseconds |

Throws `SnapAPIError` if no API key is available.

---

### `screenshot(url, options?): Promise<Buffer>`

Capture a webpage as an image.

| Option | Type | Default | Description |
|---|---|---|---|
| `format` | `'png' \| 'jpeg' \| 'webp'` | `'png'` | Output format |
| `width` | `number` | `1280` | Viewport width in pixels |
| `height` | `number` | `800` | Viewport height in pixels |
| `full_page` | `boolean` | `false` | Capture full scrollable page |
| `dark_mode` | `boolean` | `false` | Emulate `prefers-color-scheme: dark` |
| `device` | `string` | — | Device preset (`iphone14`, `pixel7`, `ipad`, `desktop`) |
| `selector` | `string` | — | CSS selector — capture only that element |
| `delay` | `number` | — | Extra milliseconds to wait before capture |

Returns `Buffer` of raw image bytes.

---

### `metadata(url): Promise<MetadataResult>`

Extract OG tags, title, favicon, canonical URL, and language from a webpage.

```typescript
const meta = await client.metadata('https://example.com');
// meta.title, meta.og_title, meta.og_image, meta.og_description,
// meta.og_type, meta.favicon, meta.canonical, meta.language
```

---

### `analyze(url, options?): Promise<AnalyzeResult>`

Full page intelligence: page type, CTA, navigation, tech stack, word count, and more.

| Option | Type | Default | Description |
|---|---|---|---|
| `screenshot` | `boolean` | `false` | Include base64 screenshot in response |

```typescript
const result = await client.analyze('https://stripe.com', { screenshot: true });
// result.page_type, result.primary_cta, result.technologies,
// result.word_count, result.load_time_ms, result.nav_items,
// result.screenshot (base64 data URI when screenshot: true)
```

---

### `pdf(url, options?): Promise<Buffer>`

Convert a URL to a PDF.

| Option | Type | Default | Description |
|---|---|---|---|
| `format` | `'A4' \| 'A3' \| 'A5' \| 'Letter' \| 'Legal' \| 'Tabloid'` | `'A4'` | Paper format |
| `landscape` | `boolean` | `false` | Landscape orientation |
| `margin_top` | `number` | `20` | Top margin in pixels |
| `margin_bottom` | `number` | `20` | Bottom margin in pixels |
| `margin_left` | `number` | `20` | Left margin in pixels |
| `margin_right` | `number` | `20` | Right margin in pixels |
| `print_background` | `boolean` | `true` | Print CSS background colors/images |
| `scale` | `number` | `1` | Page scale (0.1–2.0) |
| `delay` | `number` | — | Extra milliseconds to wait before generating |

Returns `Buffer` of raw PDF bytes.

---

### `render(html, options?): Promise<Buffer>`

Convert raw HTML to a pixel-perfect image. Ideal for OG cards and email previews.

| Option | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `1200` | Viewport width in pixels |
| `height` | `number` | `630` | Viewport height in pixels |
| `format` | `'png' \| 'jpeg' \| 'webp'` | `'png'` | Output format |

```typescript
const html = `<div style="background:#1a1a2e;color:#fff;padding:80px;font-size:48px">
  My OG Card
</div>`;
const png = await client.render(html, { width: 1200, height: 630 });
fs.writeFileSync('og-card.png', png);
```

---

### `batch(urls, endpoint?, options?): Promise<BatchResult[]>`

Process multiple URLs in parallel.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `urls` | `string[]` | — | URLs to process |
| `endpoint` | `'screenshot' \| 'metadata' \| 'analyze'` | `'screenshot'` | Operation per URL |
| `options` | `object` | — | Extra params forwarded to each call |

```typescript
const results = await client.batch(
  ['https://stripe.com', 'https://vercel.com', 'https://render.com'],
  'metadata'
);

for (const r of results) {
  if (r.status === 'ok') console.log(r.url, r.og_title);
  else console.error(r.url, r.error);
}
```

---

### `SnapAPIError`

All API errors throw `SnapAPIError`:

```typescript
import SnapAPI, { SnapAPIError } from 'snapapi';

try {
  const png = await client.screenshot('https://example.com');
} catch (err) {
  if (err instanceof SnapAPIError) {
    console.error(`Error ${err.status}: ${err.body}`);
  }
}
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `SNAPAPI_KEY` | Your SnapAPI API key (used when no key is passed to constructor) |

---

## Get a Free API Key

100 calls/month, no credit card, active in 30 seconds.

→ **[snapapi.tech](https://snapapi.tech)**

---

## License

MIT
