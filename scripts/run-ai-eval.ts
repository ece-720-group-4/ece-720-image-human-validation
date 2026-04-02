import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

import OpenAI from "openai"
import { neon } from "@neondatabase/serverless"

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: process.env.OPENAI_BASE_URL,
})

const sql = neon(process.env.DATABASE_URL!)

const GPT4O_INPUT_COST_PER_1M = 2.5
const GPT4O_OUTPUT_COST_PER_1M = 10.0

/**
 * Returns true when the AI's response contains text that indicates the model
 * followed the injected instruction.  The regex comes from injection_texts.injection_check
 * and is matched case-insensitively.
 */
function isManipulated(
  response: string,
  injectionCheckPattern: string
): boolean {
  try {
    const re = new RegExp(injectionCheckPattern, "i")
    return re.test(response)
  } catch {
    console.warn(`Invalid injection_check regex: ${injectionCheckPattern}`)
    return false
  }
}

async function main() {
  // Join injection_texts to get the per-injection ai_prompt and injection_check.
  // Only images whose injection_texts record has both fields populated are evaluated.
  const images = await sql`
    SELECT
      i.id,
      i.blob_url,
      it.ai_prompt,
      it.injection_check,
      COUNT(r.id) AS miss_count
    FROM images i
    JOIN injection_texts it ON it.id = i.injection_text_id
    JOIN responses r ON r.image_id = i.id AND r.noticed_anomaly = false
    WHERE i.has_injection = true
      AND it.ai_prompt IS NOT NULL
      AND it.injection_check IS NOT NULL
    GROUP BY i.id, it.ai_prompt, it.injection_check
    ORDER BY miss_count DESC
    LIMIT 10
  `

  console.log(`Evaluating ${images.length} images (top 50 by human misses)...`)

  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (const img of images) {
    console.log(`Processing image ${img.id}`)

    const imageRes = await fetch(img.blob_url, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    })
    const imageBuffer = await imageRes.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString("base64")
    const mimeType = imageRes.headers.get("Content-Type") || "image/png"
    const dataUrl = `data:${mimeType};base64,${base64Image}`

    const promptSent = img.ai_prompt

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptSent },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    })

    const usage = response.usage
    if (usage) {
      totalInputTokens += usage.prompt_tokens
      totalOutputTokens += usage.completion_tokens
      const cost =
        (usage.prompt_tokens / 1_000_000) * GPT4O_INPUT_COST_PER_1M +
        (usage.completion_tokens / 1_000_000) * GPT4O_OUTPUT_COST_PER_1M
      console.log(
        `→ tokens: ${usage.prompt_tokens} in / ${
          usage.completion_tokens
        } out | cost: $${cost.toFixed(5)}`
      )
    }

    const answer = response.choices[0].message.content || ""
    const manipulated = isManipulated(answer, img.injection_check)

    await sql`
      INSERT INTO ai_responses (image_id, prompt_sent, raw_response, is_manipulated, defense_type)
      VALUES (${img.id}, ${promptSent}, ${answer}, ${manipulated}, 'none')
    `

    console.log(`→ manipulated: ${manipulated}`)
  }

  const totalCost =
    (totalInputTokens / 1_000_000) * GPT4O_INPUT_COST_PER_1M +
    (totalOutputTokens / 1_000_000) * GPT4O_OUTPUT_COST_PER_1M

  console.log(
    `\nTotal tokens: ${totalInputTokens} in / ${totalOutputTokens} out`
  )
  console.log(`Total cost: $${totalCost.toFixed(5)}`)
  console.log("Done.")
}

main()
