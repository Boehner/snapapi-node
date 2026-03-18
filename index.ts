/**
 * SnapAPI TypeScript/Node.js SDK
 *
 * Official SDK for the SnapAPI web intelligence API.
 * Uses only Node.js built-in modules — no npm dependencies.
 *
 * Install:  npm install snapapi
 * Docs:     https://snapapi.tech/docs
 * Free key: https://snapapi.tech
 */

import * as https from 'node:https';
import { URL, URLSearchParams } from 'node:url';
import { Buffer } from 'node:buffer';

// ─── Response interfaces ───────────────────────────────────────────────────────

export interface ScreenshotOptions {
  format?: 'png' | 'jpeg' | 'webp';
  width?: number;
  height?: number;
  full_page?: boolean;
  dark_mode?: boolean;
  device?: string;
  selector?: string;
  delay?: number;
}

export interface PdfOptions {
  format?: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'Tabloid';
  landscape?: boolean;
  margin_top?: number;
  margin_bottom?: number;
  margin_left?: number;
  margin_right?: number;
  print_background?: boolean;
  scale?: number;
  delay?: number;
}

export interface RenderOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg' | 'webp';
}

export interface AnalyzeOptions {
  screenshot?: boolean;
}

export interface MetadataResult {
  url: string;
  title: string;
  description: string;
  og_title: string;
  og_description: string;
  og_image: string;
  og_type: string;
  favicon: string;
  canonical: string;
  language: string;
}

export interface AnalyzeResult {
  url: string;
  page_type: string;
  primary_cta: string;
  nav_items: string[];
  buttons: string[];
  forms: Array<{ fields: string[]; submit_text: string }>;
  headings: Array<{ level: number; text: string }>;
  technologies: string[];
  word_count: number;
  load_time_ms: number;
  og_title: string;
  og_image: string;
  og_description: string;
  screenshot?: string; // base64 data URI, present when screenshot: true
}

export interface BatchResult {
  url: string;
  status: 'ok' | 'error';
  error?: string;
  // screenshot endpoint
  screenshot?: string;
  format?: string;
  // metadata endpoint
  title?: string;
  og_title?: string;
  og_image?: string;
  // analyze endpoint
  page_type?: string;
  primary_cta?: string;
  technologies?: string[];
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class SnapAPIError extends Error {
  public readonly status: number;
  public readonly body: string;

  constructor(status: number, body: string) {
    const message = `SnapAPI error ${status}: ${body}`;
    super(message);
    this.name = 'SnapAPIError';
    this.status = status;
    this.body = body;
    // Maintain prototype chain in transpiled JS
    Object.setPrototypeOf(this, SnapAPIError.prototype);
  }
}

// ─── SnapAPI client ───────────────────────────────────────────────────────────

const BASE_URL = 'https://snapapi.tech';
const DEFAULT_TIMEOUT_MS = 45_000;

export class SnapAPI {
  private readonly apiKey: string;
  private readonly timeout: number;

  /**
   * Create a SnapAPI client.
   *
   * @param apiKey  Your SnapAPI API key.  If omitted, reads from SNAPAPI_KEY env var.
   * @param timeout Request timeout in milliseconds (default: 45 000).
   *
   * @example
   * const client = new SnapAPI();                      // uses SNAPAPI_KEY env var
   * const client = new SnapAPI('snap_yourkey');         // explicit key
   * const client = new SnapAPI(undefined, 60_000);     // 60s timeout
   */
  constructor(apiKey?: string, timeout?: number) {
    const key = apiKey ?? process.env.SNAPAPI_KEY ?? '';
    if (!key) {
      throw new SnapAPIError(
        0,
        'No API key provided. Set the SNAPAPI_KEY environment variable or pass apiKey to the constructor.\n' +
        'Get a free key at https://snapapi.tech',
      );
    }
    this.apiKey = key;
    this.timeout = timeout ?? DEFAULT_TIMEOUT_MS;
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  private get(path: string, params: Record<string, string | number | boolean>): Promise<Buffer> {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    const urlStr = `${BASE_URL}${path}?${qs}`;
    return this.request('GET', urlStr, undefined);
  }

  private post(path: string, body: unknown): Promise<Buffer> {
    const urlStr = `${BASE_URL}${path}`;
    const payload = JSON.stringify(body);
    return this.request('POST', urlStr, payload);
  }

  private request(method: string, urlStr: string, body?: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(urlStr);
      const options: https.RequestOptions = {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + (parsed.search || ''),
        method,
        headers: {
          'x-api-key': this.apiKey,
          ...(body
            ? { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(body)) }
            : {}),
        },
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          const status = res.statusCode ?? 0;
          if (status < 200 || status >= 300) {
            const text = buf.toString('utf8');
            let msg: string;
            try { msg = (JSON.parse(text) as { error?: string }).error ?? text; }
            catch { msg = text; }
            reject(new SnapAPIError(status, msg.slice(0, 500)));
          } else {
            resolve(buf);
          }
        });
        res.on('error', reject);
      });

      req.on('error', reject);
      req.setTimeout(this.timeout, () => {
        req.destroy(new SnapAPIError(0, `Request timed out after ${this.timeout}ms`));
      });

      if (body) req.write(body);
      req.end();
    });
  }

  private async getJson<T>(path: string, params: Record<string, string | number | boolean>): Promise<T> {
    const buf = await this.get(path, params);
    const text = buf.toString('utf8');
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new SnapAPIError(0, `Invalid JSON response: ${text.slice(0, 200)}`);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Capture a screenshot of a webpage.
   *
   * @returns Raw image bytes (PNG/JPEG/WebP).
   *
   * @example
   * const png = await client.screenshot('https://github.com', { full_page: true });
   * fs.writeFileSync('github.png', png);
   */
  async screenshot(url: string, options?: ScreenshotOptions): Promise<Buffer> {
    const params: Record<string, string | number | boolean> = {
      url,
      format: options?.format ?? 'png',
      width: options?.width ?? 1280,
      height: options?.height ?? 800,
      full_page: options?.full_page ?? false,
      dark_mode: options?.dark_mode ?? false,
      ...(options?.device   ? { device: options.device }     : {}),
      ...(options?.selector ? { selector: options.selector } : {}),
      ...(options?.delay    ? { delay: options.delay }       : {}),
    };
    return this.get('/v1/screenshot', params);
  }

  /**
   * Extract metadata from a webpage (OG tags, title, favicon, canonical, etc.).
   *
   * @example
   * const meta = await client.metadata('https://github.com');
   * console.log(meta.og_image);
   */
  async metadata(url: string): Promise<MetadataResult> {
    return this.getJson<MetadataResult>('/v1/metadata', { url });
  }

  /**
   * Full page analysis: page type, primary CTA, tech stack, word count, and more.
   *
   * @param options.screenshot  Include a base64-encoded screenshot in the response.
   *
   * @example
   * const data = await client.analyze('https://stripe.com');
   * console.log(data.page_type, data.primary_cta, data.technologies);
   */
  async analyze(url: string, options?: AnalyzeOptions): Promise<AnalyzeResult> {
    const params: Record<string, string | number | boolean> = { url };
    if (options?.screenshot) params.screenshot = 'true';
    return this.getJson<AnalyzeResult>('/v1/analyze', params);
  }

  /**
   * Convert a URL to a PDF.
   *
   * @returns Raw PDF bytes.
   *
   * @example
   * const pdf = await client.pdf('https://github.com', { format: 'A4' });
   * fs.writeFileSync('page.pdf', pdf);
   */
  async pdf(url: string, options?: PdfOptions): Promise<Buffer> {
    const params: Record<string, string | number | boolean> = {
      url,
      format: options?.format ?? 'A4',
      landscape: options?.landscape ?? false,
      margin_top: options?.margin_top ?? 20,
      margin_bottom: options?.margin_bottom ?? 20,
      margin_left: options?.margin_left ?? 20,
      margin_right: options?.margin_right ?? 20,
      print_background: options?.print_background ?? true,
      scale: options?.scale ?? 1,
      ...(options?.delay ? { delay: options.delay } : {}),
    };
    return this.get('/v1/pdf', params);
  }

  /**
   * Render raw HTML to a pixel-perfect image.
   *
   * @returns Raw image bytes.
   *
   * @example
   * const html = '<h1 style="font-size:48px;padding:60px">Hello</h1>';
   * const png = await client.render(html, { width: 1200, height: 630 });
   * fs.writeFileSync('card.png', png);
   */
  async render(html: string, options?: RenderOptions): Promise<Buffer> {
    const body = {
      html,
      width: options?.width ?? 1200,
      height: options?.height ?? 630,
      format: options?.format ?? 'png',
    };
    return this.post('/v1/render', body);
  }

  /**
   * Process multiple URLs in parallel.
   *
   * @param urls      Array of URLs to process.
   * @param endpoint  Which operation to run per URL: 'screenshot' | 'metadata' | 'analyze'.
   * @param options   Extra parameters forwarded to each per-URL call.
   *
   * @example
   * const results = await client.batch(
   *   ['https://stripe.com', 'https://vercel.com'],
   *   'metadata'
   * );
   * results.forEach(r => console.log(r.url, r.og_title));
   */
  async batch(
    urls: string[],
    endpoint: 'screenshot' | 'metadata' | 'analyze' = 'screenshot',
    options?: Record<string, unknown>,
  ): Promise<BatchResult[]> {
    const payload: Record<string, unknown> = { urls, endpoint };
    if (options) payload.params = options;

    const buf = await this.post('/v1/batch', payload);
    const text = buf.toString('utf8');
    try {
      const data = JSON.parse(text) as { results?: BatchResult[] };
      return data.results ?? [];
    } catch {
      throw new SnapAPIError(0, `Invalid JSON in batch response: ${text.slice(0, 200)}`);
    }
  }
}

export default SnapAPI;
