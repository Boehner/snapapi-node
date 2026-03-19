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
import { Buffer } from 'node:buffer';
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
    forms: Array<{
        fields: string[];
        submit_text: string;
    }>;
    headings: Array<{
        level: number;
        text: string;
    }>;
    technologies: string[];
    word_count: number;
    load_time_ms: number;
    og_title: string;
    og_image: string;
    og_description: string;
    screenshot?: string;
}
export interface BatchResult {
    url: string;
    status: 'ok' | 'error';
    error?: string;
    screenshot?: string;
    format?: string;
    title?: string;
    og_title?: string;
    og_image?: string;
    page_type?: string;
    primary_cta?: string;
    technologies?: string[];
}
export declare class SnapAPIError extends Error {
    readonly status: number;
    readonly body: string;
    constructor(status: number, body: string);
}
export declare class SnapAPI {
    private readonly apiKey;
    private readonly timeout;
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
    constructor(apiKey?: string, timeout?: number);
    private get;
    private post;
    private request;
    private getJson;
    /**
     * Capture a screenshot of a webpage.
     *
     * @returns Raw image bytes (PNG/JPEG/WebP).
     *
     * @example
     * const png = await client.screenshot('https://github.com', { full_page: true });
     * fs.writeFileSync('github.png', png);
     */
    screenshot(url: string, options?: ScreenshotOptions): Promise<Buffer>;
    /**
     * Extract metadata from a webpage (OG tags, title, favicon, canonical, etc.).
     *
     * @example
     * const meta = await client.metadata('https://github.com');
     * console.log(meta.og_image);
     */
    metadata(url: string): Promise<MetadataResult>;
    /**
     * Full page analysis: page type, primary CTA, tech stack, word count, and more.
     *
     * @param options.screenshot  Include a base64-encoded screenshot in the response.
     *
     * @example
     * const data = await client.analyze('https://stripe.com');
     * console.log(data.page_type, data.primary_cta, data.technologies);
     */
    analyze(url: string, options?: AnalyzeOptions): Promise<AnalyzeResult>;
    /**
     * Convert a URL to a PDF.
     *
     * @returns Raw PDF bytes.
     *
     * @example
     * const pdf = await client.pdf('https://github.com', { format: 'A4' });
     * fs.writeFileSync('page.pdf', pdf);
     */
    pdf(url: string, options?: PdfOptions): Promise<Buffer>;
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
    render(html: string, options?: RenderOptions): Promise<Buffer>;
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
    batch(urls: string[], endpoint?: 'screenshot' | 'metadata' | 'analyze', options?: Record<string, unknown>): Promise<BatchResult[]>;
}
export default SnapAPI;
