export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { food_name, weight_g } = req.body;
    if (!food_name) {
        return res.status(400).json({ error: 'Missing food_name' });
    }

    const keys = Object.keys(process.env)
        .filter(key => key.startsWith('GEMINI_API_KEY'))
        .map(key => process.env[key])
        .filter(Boolean);

    if (keys.length === 0) {
        return res.status(500).json({ error: 'No GEMINI_API_KEY configured in .env.local' });
    }

    const prompt = `Estimate nutrition for the following meal.

Dish: ${food_name}
Estimated weight: ${weight_g || 300}g

Return JSON only:
{
 "food_name": "${food_name}",
 "weight_g": ${weight_g || 300},
 "calories": 0,
 "protein_g": 0,
 "carbs_g": 0,
 "fat_g": 0
}`;

    let lastError = null;

    for (const apiKey of keys) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: "application/json",
                    }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!resultText) {
                throw new Error('Invalid response from Gemini');
            }

            try {
                const parsed = JSON.parse(resultText);
                return res.status(200).json(parsed);
            } catch (parseError) {
                console.error('Failed to parse Gemini output:', resultText);
                throw new Error('AI returned invalid JSON format');
            }

        } catch (error) {
            console.warn('Nutrition estimation error with key, trying next if available:', error.message);
            lastError = error;
        }
    }

    console.error('All API keys failed. Last error:', lastError);
    if (lastError && lastError.message && lastError.message.includes('429')) {
        return res.status(429).json({ error: 'AI Rate limit exceeded. Please wait 1 minute before trying again.' });
    }
    return res.status(500).json({ error: 'Failed to estimate nutrition' });
}
