/**
 * Google AI Studio Helper Functions
 * 
 */

import { EvaluationResultSchema, type EvaluationResult } from "./schemas.ts";

/**
 * Call Google AI Studio (Gemini) API
 * 
 * @param systemInstruction - System prompt
 * @param userContent - User content (JSON string with proposal data)
 * @param apiKey - Google AI Studio API key
 * @returns EvaluationResult with ranked proposals
 */
export async function callGoogleAIStudio(
  systemInstruction: string,
  userContent: string,
  apiKey: string
): Promise<EvaluationResult> {
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash';
  
  console.log('[Evaluate] Using Google AI Studio API');
  console.log('[Evaluate] Model:', model);
  
  // Google AI Studio endpoint
  // Use v1 for gemini-1.5 models, v1beta for gemini-3 models
  const apiVersion = model.includes('gemini-3') ? 'v1beta' : 'v1';
  const aiEndpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`;
  
  console.log('[Evaluate] Endpoint:', aiEndpoint);
  
  // Google AI Studio payload format
  // responseMimeType is only supported in v1beta, not in v1
  const generationConfig: any = {
    temperature: 0.0, // Deterministic output
    topK: 1,
    topP: 0.95,
    maxOutputTokens: 8192,
  };
  
  // Only add responseMimeType for v1beta API
  if (apiVersion === 'v1beta') {
    generationConfig.responseMimeType = "application/json";
  }
  
  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${systemInstruction}\n\n${userContent}`
          }
        ]
      }
    ],
    generationConfig: generationConfig
  };

  console.log('[Evaluate] Calling Google AI Studio API...');
  
  const response = await fetch(aiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Evaluate] Google AI Studio API error:', response.status, errorText);
    throw new Error(`AI API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const result = await response.json();
  console.log('[Evaluate] Google AI Studio response received');

  // Extract JSON from response
  const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!jsonText) {
    console.error('[Evaluate] No content in Google AI Studio response:', JSON.stringify(result).substring(0, 500));
    throw new Error('No content in AI response. Check API response format.');
  }

  // Clean JSON (remove markdown code blocks if present)
  let cleanedJson = jsonText.trim();
  if (cleanedJson.startsWith('```json')) {
    cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedJson.startsWith('```')) {
    cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Parse and validate JSON
  let parsed: any;
  try {
    parsed = JSON.parse(cleanedJson);
  } catch (error) {
    console.error('[Evaluate] Invalid JSON:', cleanedJson.substring(0, 500));
    throw new Error(`Invalid JSON response from AI: ${error.message}`);
  }

  // Validate with Zod
  const validated = EvaluationResultSchema.parse(parsed);
  return validated;
}

