import axios from "axios";

export async function summarizeText(
  text: string,
  maxTokens: number,
  style: string
): Promise<string> {

  try {
    console.log("[AI] Using HuggingFace API...");

    const response = await axios.post(
      "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
      {
        inputs: text,
        parameters: {
          max_length: maxTokens,
          min_length: 10
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`
        }
      }
    );

    const summary = response.data[0]?.summary_text;

    return summary || "No summary generated";

  } catch (error: any) {
    console.error("[AI] HuggingFace error:", error.message);

    //  fallback
    return text.length > 50
      ? text.slice(0, 50) + "..."
      : text;
  }
}
