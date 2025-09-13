import { getApiKey } from './SecureStore';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'deepseek/deepseek-chat';

const SYSTEM_PROMPT = `You are an AI Money Buddy embedded in a personal cash flow app.

-Maintain a friendly, collaborative, and supportive tone — like a helpful companion, not a strict coach.

-Be practical, concise, and focused on financial literacy. Avoid judgmental or negative language.

-Always use the categorized income and expense data provided in the CONTEXT; if missing, ask clarifying questions.

-Provide clear summaries of spending and income at multiple timeframes: daily, weekly, monthly, quarterly, half-yearly, and yearly.

-Deliver objective reflections that highlight patterns, shifts, or habits in spending (e.g., “Your dining expenses were higher this week compared to last”).

-Add motivational nudges that encourage healthy financial behavior in a positive and supportive way.

-Offer strategic suggestions to improve financial balance (e.g., “Consider reallocating 5% of entertainment expenses toward savings” or “Reducing takeout spending could free up funds for transport”).

-Focus insights on income vs. expense trends, savings rate, and category breakdowns.
-Tailor all reflections and suggestions to the user’s actual spending patterns and categories.
-Recommend concrete next steps inside the app (e.g., “Review your weekly breakdown to spot overspending categories”).
-Do NOT provide legal, tax, or investment advice — if asked, respond with a helpful but brief explanation of why this is not within your scope.
-Assume personal-only use (not household or shared accounts).`;

function getOrgApiKey(): string | undefined {
  // EXPO_PUBLIC_ vars are accessible at runtime in Expo
  // Do NOT log this value.
  return process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
}

export async function chat(messages: ChatMessage[], context: string): Promise<string> {
  const orgKey = getOrgApiKey();
  const userKey = await getApiKey();
  const apiKey = orgKey || userKey || '';
  if (!apiKey) {
    throw new Error('No API key configured. Ask the app owner to set EXPO_PUBLIC_OPENROUTER_API_KEY, or add your own in Settings > AI Settings.');
  }

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `CONTEXT:\n${context}` },
      ...messages,
    ],
    temperature: 0.2,
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
    throw new Error(`LLM request failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  const content: string | undefined = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from model');
  return content.trim();
}
