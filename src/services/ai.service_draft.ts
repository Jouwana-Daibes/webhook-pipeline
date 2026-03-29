import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// صغير helper للنوم (delay)
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function summarizeText(
  text: string,
  maxTokens: number,
  style: string
): Promise<string> {

  const prompt =
    style === "bullet"
      ? "Summarize the following text in bullet points."
      : "Summarize the following text in one short clear sentence.";

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[AI] Attempt ${attempt}...`);

      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: text }
        ],
        max_tokens: maxTokens
      });

      return response.choices[0].message.content || "No summary";

    } catch (error: any) {

      console.error(`[AI] Error on attempt ${attempt}:`, error.message);

      // Retry only if rate limit (429)
      if (error.status === 429 && attempt < MAX_RETRIES) {
        console.log("[AI] Rate limited. Retrying in 2 seconds...");
        await sleep(2000);
        continue;
      }

      // If not retryable OR retries finished → fallback
      console.log("[AI] Using fallback summarization...");

      return text.length > 50
        ? text.slice(0, 50) + "..."
        : text;
    }
  }

  // fallback safety (should never reach here)
  return text;
}
