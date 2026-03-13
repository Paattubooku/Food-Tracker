import 'dotenv/config';
import { readFile } from 'fs/promises';
import { createServer } from 'http';
import { parse } from 'url';

// Load .env.local manually (dotenv loads .env by default, not .env.local)
import { config } from 'dotenv';
config({ path: '.env.local' });

const PORT = 3001;

// Dynamically import all API handlers
const handlers = {};
const routes = [
    'dashboard', 'meals', 'foods', 'weight',
    'grocery', 'insights', 'prediction', 'users', 'analyze-image', 'estimate-nutrition'
];

async function loadHandlers() {
    for (const route of routes) {
        try {
            const mod = await import(`./api/${route}.js`);
            handlers[route] = mod.default;
            console.log(`  ✓ Loaded /api/${route}`);
        } catch (e) {
            console.warn(`  ✗ Failed to load /api/${route}:`, e.message);
        }
    }
}

function parseBody(req) {
    return new Promise((resolve) => {
        let body = '';
        // Set an explicit encoding for string concatenation
        req.setEncoding('utf8');
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch { resolve({}); }
        });
        req.on('error', () => resolve({}));
    });
}

async function startServer() {
    await loadHandlers();

    const server = createServer(async (req, res) => {
        const parsed = parse(req.url, true);
        const pathname = parsed.pathname;

        // CORS headers for all responses
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        // Match /api/<route> (allowing hyphens)
        const match = pathname.match(/^\/api\/([\w-]+)/);
        if (match) {
            const routeName = match[1];
            const handler = handlers[routeName];
            if (handler) {
                // Build a req/res compatible with Vercel handler signature
                req.query = parsed.query;
                req.body = req.method !== 'GET' ? await parseBody(req) : {};

                const mockRes = {
                    _status: 200,
                    _headers: {},
                    status(code) { this._status = code; return this; },
                    setHeader(k, v) { this._headers[k] = v; return this; },
                    json(data) {
                        if (this._headersSent) return;
                        this._headersSent = true;
                        res.writeHead(this._status, { 'Content-Type': 'application/json', ...this._headers });
                        res.end(JSON.stringify(data));
                    },
                    end() {
                        if (this._headersSent) return;
                        this._headersSent = true;
                        res.writeHead(this._status, this._headers);
                        res.end();
                    },
                    send(data) {
                        if (this._headersSent) return;
                        this._headersSent = true;
                        res.writeHead(this._status, { 'Content-Type': 'text/plain', ...this._headers });
                        res.end(String(data));
                    }
                };

                try {
                    await handler(req, mockRes);
                } catch (err) {
                    console.error(`Error in /api/${routeName}:`, err);
                    if (!mockRes._headersSent) {
                        mockRes._headersSent = true;
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
                    }
                }
                return;
            }
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
    });

    server.listen(PORT, () => {
        console.log(`\n🚀 API server running at http://localhost:${PORT}`);
        console.log(`   Available routes:`);
        routes.forEach(r => console.log(`   → http://localhost:${PORT}/api/${r}`));
        console.log(`\n   Now run: npm run dev\n`);
    });
}

startServer().catch(console.error);
