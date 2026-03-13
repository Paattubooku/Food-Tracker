// /api/analyze-image.js

const PROMPT = `Analyze the food image.
Return the most likely dish and up to 3 visually similar dishes.
Estimate the weight in grams as well.

Return JSON only exactly in this structure with NO markdown formatting:

{
  "primary_food": "",
  "possible_alternatives": ["", "", ""],
  "weight_g": 0
}`;

// ──────────────────────────────────────────────
// PROVIDER 1: GEMINI (15 RPM free)
// ──────────────────────────────────────────────
async function tryGemini(imageBase64, mimeType) {
    const keys = Object.keys(process.env)
        .filter(k => k.startsWith('GEMINI_API_KEY'))
        .map(k => process.env[k])
        .filter(Boolean);

    for (const apiKey of keys) {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: PROMPT },
                            { inlineData: { mimeType, data: imageBase64 } }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: "application/json",
                    }
                })
            }
        );

        if (!response.ok) throw new Error(`Gemini ${response.status}`);

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Empty Gemini response');
        return JSON.parse(text);
    }
    throw new Error('No Gemini keys');
}

// ──────────────────────────────────────────────
// PROVIDER 2: GROQ (30 RPM free, very fast)
// Get key: https://console.groq.com
// ──────────────────────────────────────────────
async function tryGroq(imageBase64, mimeType) {
    const keys = Object.keys(process.env)
        .filter(k => k.startsWith('GROQ_API_KEY'))
        .map(k => process.env[k])
        .filter(Boolean);

    for (const apiKey of keys) {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'llama-3.2-90b-vision-preview',
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: PROMPT },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:${mimeType};base64,${imageBase64}`
                            }
                        }
                    ]
                }],
                temperature: 0.1,
                response_format: { type: 'json_object' },
                max_tokens: 512,
            })
        });

        if (!response.ok) throw new Error(`Groq ${response.status}`);

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error('Empty Groq response');
        return JSON.parse(text);
    }
    throw new Error('No Groq keys');
}

// ──────────────────────────────────────────────
// PROVIDER 3: OPENROUTER (free models available)
// Get key: https://openrouter.ai/keys
// ──────────────────────────────────────────────
async function tryOpenRouter(imageBase64, mimeType) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('No OpenRouter key');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            // Free models with vision support
            model: 'meta-llama/llama-3.2-11b-vision-instruct:free',
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: PROMPT },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:${mimeType};base64,${imageBase64}`
                        }
                    }
                ]
            }],
            temperature: 0.1,
        })
    });

    if (!response.ok) throw new Error(`OpenRouter ${response.status}`);

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty OpenRouter response');

    // Free models may not support response_format,
    // so extract JSON manually
    text = extractJSON(text);
    return JSON.parse(text);
}

// ──────────────────────────────────────────────
// PROVIDER 4: HUGGINGFACE INFERENCE (free tier)
// Get key: https://huggingface.co/settings/tokens
// ──────────────────────────────────────────────
async function tryHuggingFace(imageBase64, mimeType) {
    const apiKey = process.env.HF_API_KEY;
    if (!apiKey) throw new Error('No HuggingFace key');

    const response = await fetch(
        'https://router.huggingface.co/novita/v3/openai/chat/completions',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'Qwen/Qwen2.5-VL-72B-Instruct',
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: PROMPT },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:${mimeType};base64,${imageBase64}`
                            }
                        }
                    ]
                }],
                temperature: 0.1,
                max_tokens: 512,
            })
        }
    );

    if (!response.ok) throw new Error(`HF ${response.status}`);

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty HF response');

    text = extractJSON(text);
    return JSON.parse(text);
}

// ──────────────────────────────────────────────
// UTILITY: Extract JSON from markdown-wrapped text
// ──────────────────────────────────────────────
function extractJSON(text) {
    // Remove ```json ... ``` wrapping if present
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return match[1].trim();

    // Try to find raw JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return jsonMatch[0];

    return text;
}

// ──────────────────────────────────────────────
// MAIN HANDLER: Cascading fallback
// ──────────────────────────────────────────────
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { imageBase64, mimeType: rawMime } = req.body;
    if (!imageBase64) {
        return res.status(400).json({ error: 'Missing image data' });
    }

    const mimeType = rawMime || 'image/jpeg';

    const providers = [
        { name: 'Gemini', fn: () => tryGemini(imageBase64, mimeType) },
        { name: 'Groq', fn: () => tryGroq(imageBase64, mimeType) },
        { name: 'OpenRouter', fn: () => tryOpenRouter(imageBase64, mimeType) },
        { name: 'HuggingFace', fn: () => tryHuggingFace(imageBase64, mimeType) },
    ];

    let lastError = null;
    let usedProvider = null;

    for (const provider of providers) {
        try {
            console.log(`Trying ${provider.name}...`);
            const result = await provider.fn();

            // Validate result shape
            if (result.primary_food) {
                usedProvider = provider.name;
                return res.status(200).json({
                    ...result,
                    _provider: usedProvider  // optional: track which one worked
                });
            }
            throw new Error('Invalid response shape');
        } catch (error) {
            console.warn(`${provider.name} failed:`, error.message);
            lastError = error;
        }
    }

    console.error('ALL providers failed. Last error:', lastError);

    if (lastError?.message?.includes('429')) {
        return res.status(429).json({
            error: 'All AI providers rate-limited. Wait 1 minute.'
        });
    }

    return res.status(500).json({ error: 'All AI providers failed' });
}