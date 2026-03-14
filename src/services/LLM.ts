import { getApiKey } from './SecureStore';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'deepseek/deepseek-chat';
const MAX_TOKENS = 1024;

const SYSTEM_PROMPT = `You are an AI Money Buddy embedded in a personal cash flow app.

- Always begin by checking the user's profile name and key financial metrics before responding.  
- Use the available data, visualizations, and insights to provide accurate, context-aware responses.  
- Keep all replies concise, friendly, and easy to understand — like a supportive companion, not a strict coach.

- Maintain a collaborative and positive tone. Avoid judgment, negativity, or overwhelming financial jargon.  
- Do not mention or reference any currency symbols or names (e.g., dollars, shillings, etc.), as users may operate in multiple currencies.  

- Base your insights and summaries strictly on the categorized income and expense data provided in CONTEXT.  
  If data is missing or unclear, ask clarifying questions before answering.  

- Provide clear, data-driven summaries across multiple timeframes: daily, weekly, monthly, quarterly, half-yearly, and yearly.  
- Reflect objectively on spending patterns, habits, and changes (e.g., “Your dining expenses increased compared to last week”).  

- Offer motivational, supportive nudges that encourage better financial habits and mindfulness.  
- Give strategic, actionable suggestions to improve balance between income and expenses  
  (e.g., “Consider reducing entertainment costs slightly to boost savings” or “You could set a weekly spending target for groceries”).  

- Tailor all insights to the user's actual trends and categories visible in the system.  
- Recommend next steps or actions the user can take inside the app  
  (e.g., “Review your monthly summary to see where most spending occurred”).  

- Respect user privacy and scope — do NOT give legal, tax, or investment advice.  
- Assume the account represents an individual user, not a shared or household account.  

In every interaction, your goal is to make financial awareness simple, personal, and empowering — helping the user stay on top of their money flow and build healthy habits.
`;

const FALLBACK_MODEL = 'google/gemini-2.0-flash-lite-preview-02-05:free';

function getOrgApiKey(): string | undefined {
  // EXPO_PUBLIC_ vars are accessible at runtime in Expo
  // Do NOT log this value.
  return process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function chat(messages: ChatMessage[], context: string): Promise<string> {
  const orgKey = getOrgApiKey();
  const userKey = await getApiKey();
  const apiKey = orgKey || userKey || '';
  if (!apiKey) {
    throw new Error('No API key configured. Ask the app owner to set EXPO_PUBLIC_OPENROUTER_API_KEY, or add your own in Settings > AI Settings.');
  }

  const modelsToTry = [MODEL, FALLBACK_MODEL];
  let lastError: any = null;

  for (const model of modelsToTry) {
    let retries = 0;
    const maxRetries = model === MODEL ? 2 : 1; // Retry primary more than fallback

    while (retries <= maxRetries) {
      try {
        const body = {
          model: model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'system', content: `CONTEXT:\n${context}` },
            ...messages,
          ],
          temperature: 0.2,
          max_tokens: MAX_TOKENS,
        };

        const res = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'cashflow-tracker',
            'X-Title': 'Cashflow Tracker AI Accountant',
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const text = await res.text();
          const status = res.status;

          // Retry on 5xx errors or 429 (rate limit)
          if ((status >= 500 || status === 429) && retries < maxRetries) {
            retries++;
            const delay = Math.pow(2, retries) * 1000;
            console.log(`LLM request failed (${status}). Retrying in ${delay}ms (Attempt ${retries}/${maxRetries}) with model ${model}...`);
            await sleep(delay);
            continue;
          }
          if (status === 402) {
            throw new Error(`Insufficient Credits (402): Your OpenRouter account balance is too low for this model. Please add credits or use a free model.`);
          }
          throw new Error(`LLM request failed (${status}): ${text}`);
        }

        const json = await res.json();
        const content: string | undefined = json?.choices?.[0]?.message?.content;
        if (!content) throw new Error('Empty response from model');
        return content.trim();

      } catch (e: any) {
        lastError = e;
        console.warn(`LLM attempt failed with model ${model}:`, e.message);

        // If it was a 4xx error (other than 429), don't bother retrying or switching models
        if (e.message.includes('code: 4') && !e.message.includes('429')) {
          throw e;
        }

        // Break inner loop and try next model if retries exhausted
        break;
      }
    }
  }

  throw lastError || new Error('All LLM attempts failed');
}
