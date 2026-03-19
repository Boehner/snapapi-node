"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnapAPI = exports.SnapAPIError = void 0;
const https = __importStar(require("node:https"));
const node_url_1 = require("node:url");
const node_buffer_1 = require("node:buffer");
// ─── Error class ──────────────────────────────────────────────────────────────
class SnapAPIError extends Error {
    constructor(status, body) {
        const message = `SnapAPI error ${status}: ${body}`;
        super(message);
        this.name = 'SnapAPIError';
        this.status = status;
        this.body = body;
        // Maintain prototype chain in transpiled JS
        Object.setPrototypeOf(this, SnapAPIError.prototype);
    }
}
exports.SnapAPIError = SnapAPIError;
// ─── SnapAPI client ───────────────────────────────────────────────────────────
const BASE_URL = 'https://snapapi.tech';
const DEFAULT_TIMEOUT_MS = 45000;
class SnapAPI {
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
    constructor(apiKey, timeout) {
        var _a;
        const key = (_a = apiKey !== null && apiKey !== void 0 ? apiKey : process.env.SNAPAPI_KEY) !== null && _a !== void 0 ? _a : '';
        if (!key) {
            throw new SnapAPIError(0, 'No API key provided. Set the SNAPAPI_KEY environment variable or pass apiKey to the constructor.\n' +
                'Get a free key at https://snapapi.tech');
        }
        this.apiKey = key;
        this.timeout = timeout !== null && timeout !== void 0 ? timeout : DEFAULT_TIMEOUT_MS;
    }
    // ── Internal helpers ───────────────────────────────────────────────────────
    get(path, params) {
        const qs = new node_url_1.URLSearchParams(Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)])).toString();
        const urlStr = `${BASE_URL}${path}?${qs}`;
        return this.request('GET', urlStr, undefined);
    }
    post(path, body) {
        const urlStr = `${BASE_URL}${path}`;
        const payload = JSON.stringify(body);
        return this.request('POST', urlStr, payload);
    }
    request(method, urlStr, body) {
        return new Promise((resolve, reject) => {
            const parsed = new node_url_1.URL(urlStr);
            const options = {
                hostname: parsed.hostname,
                port: parsed.port || 443,
                path: parsed.pathname + (parsed.search || ''),
                method,
                headers: {
                    'x-api-key': this.apiKey,
                    ...(body
                        ? { 'Content-Type': 'application/json', 'Content-Length': String(node_buffer_1.Buffer.byteLength(body)) }
                        : {}),
                },
            };
            const req = https.request(options, (res) => {
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => {
                    var _a, _b;
                    const buf = node_buffer_1.Buffer.concat(chunks);
                    const status = (_a = res.statusCode) !== null && _a !== void 0 ? _a : 0;
                    if (status < 200 || status >= 300) {
                        const text = buf.toString('utf8');
                        let msg;
                        try {
                            msg = (_b = JSON.parse(text).error) !== null && _b !== void 0 ? _b : text;
                        }
                        catch (_c) {
                            msg = text;
                        }
                        reject(new SnapAPIError(status, msg.slice(0, 500)));
                    }
                    else {
                        resolve(buf);
                    }
                });
                res.on('error', reject);
            });
            req.on('error', reject);
            req.setTimeout(this.timeout, () => {
                req.destroy(new SnapAPIError(0, `Request timed out after ${this.timeout}ms`));
            });
            if (body)
                req.write(body);
            req.end();
        });
    }
    async getJson(path, params) {
        const buf = await this.get(path, params);
        const text = buf.toString('utf8');
        try {
            return JSON.parse(text);
        }
        catch (_a) {
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
    async screenshot(url, options) {
        var _a, _b, _c, _d, _e;
        const params = {
            url,
            format: (_a = options === null || options === void 0 ? void 0 : options.format) !== null && _a !== void 0 ? _a : 'png',
            width: (_b = options === null || options === void 0 ? void 0 : options.width) !== null && _b !== void 0 ? _b : 1280,
            height: (_c = options === null || options === void 0 ? void 0 : options.height) !== null && _c !== void 0 ? _c : 800,
            full_page: (_d = options === null || options === void 0 ? void 0 : options.full_page) !== null && _d !== void 0 ? _d : false,
            dark_mode: (_e = options === null || options === void 0 ? void 0 : options.dark_mode) !== null && _e !== void 0 ? _e : false,
            ...((options === null || options === void 0 ? void 0 : options.device) ? { device: options.device } : {}),
            ...((options === null || options === void 0 ? void 0 : options.selector) ? { selector: options.selector } : {}),
            ...((options === null || options === void 0 ? void 0 : options.delay) ? { delay: options.delay } : {}),
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
    async metadata(url) {
        return this.getJson('/v1/metadata', { url });
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
    async analyze(url, options) {
        const params = { url };
        if (options === null || options === void 0 ? void 0 : options.screenshot)
            params.screenshot = 'true';
        return this.getJson('/v1/analyze', params);
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
    async pdf(url, options) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const params = {
            url,
            format: (_a = options === null || options === void 0 ? void 0 : options.format) !== null && _a !== void 0 ? _a : 'A4',
            landscape: (_b = options === null || options === void 0 ? void 0 : options.landscape) !== null && _b !== void 0 ? _b : false,
            margin_top: (_c = options === null || options === void 0 ? void 0 : options.margin_top) !== null && _c !== void 0 ? _c : 20,
            margin_bottom: (_d = options === null || options === void 0 ? void 0 : options.margin_bottom) !== null && _d !== void 0 ? _d : 20,
            margin_left: (_e = options === null || options === void 0 ? void 0 : options.margin_left) !== null && _e !== void 0 ? _e : 20,
            margin_right: (_f = options === null || options === void 0 ? void 0 : options.margin_right) !== null && _f !== void 0 ? _f : 20,
            print_background: (_g = options === null || options === void 0 ? void 0 : options.print_background) !== null && _g !== void 0 ? _g : true,
            scale: (_h = options === null || options === void 0 ? void 0 : options.scale) !== null && _h !== void 0 ? _h : 1,
            ...((options === null || options === void 0 ? void 0 : options.delay) ? { delay: options.delay } : {}),
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
    async render(html, options) {
        var _a, _b, _c;
        const body = {
            html,
            width: (_a = options === null || options === void 0 ? void 0 : options.width) !== null && _a !== void 0 ? _a : 1200,
            height: (_b = options === null || options === void 0 ? void 0 : options.height) !== null && _b !== void 0 ? _b : 630,
            format: (_c = options === null || options === void 0 ? void 0 : options.format) !== null && _c !== void 0 ? _c : 'png',
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
    async batch(urls, endpoint = 'screenshot', options) {
        var _a;
        const payload = { urls, endpoint };
        if (options)
            payload.params = options;
        const buf = await this.post('/v1/batch', payload);
        const text = buf.toString('utf8');
        try {
            const data = JSON.parse(text);
            return (_a = data.results) !== null && _a !== void 0 ? _a : [];
        }
        catch (_b) {
            throw new SnapAPIError(0, `Invalid JSON in batch response: ${text.slice(0, 200)}`);
        }
    }
}
exports.SnapAPI = SnapAPI;
exports.default = SnapAPI;
