/**
 * Vertex AI Helper Functions
 * 
 * Replaces OpenAI integration with Google Vertex AI (Gemini).
 * Requires Service Account JSON key with Vertex AI permissions.
 */

import { EvaluationResultSchema, type EvaluationResult } from "./schemas.ts";

// Cache for access token (valid for 1 hour)
let cachedAccessToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get cached access token or generate new one if expired
 * 
 * @param serviceAccountJson - Service Account JSON object
 * @returns Access token string
 */
export async function getCachedAccessToken(serviceAccountJson: any): Promise<string> {
  const now = Date.now();
  
  // If token exists and hasn't expired (with 5 minute buffer), return it
  if (cachedAccessToken && tokenExpiry > now + 5 * 60 * 1000) {
    console.log('[Vertex AI] Using cached access token');
    return cachedAccessToken;
  }
  
  // Generate new token
  console.log('[Vertex AI] Generating new access token...');
  const jwt = await generateJWT(serviceAccountJson);
  const accessToken = await exchangeJWTForAccessToken(jwt);
  
  // Cache token (valid for 55 minutes, to have buffer)
  cachedAccessToken = accessToken;
  tokenExpiry = now + 55 * 60 * 1000;
  
  return accessToken;
}

/**
 * Generate JWT token for Service Account authentication
 * Uses djwt library for Deno
 * 
 * @param serviceAccountJson - Service Account JSON object
 * @returns JWT token string
 */
async function generateJWT(serviceAccountJson: any): Promise<string> {
  try {
    // Use djwt library for Deno
    const { create, importPKCS8 } = await import("https://deno.land/x/djwt@v3.0.2/mod.ts");
    
    const now = Math.floor(Date.now() / 1000);
    
    // JWT Payload
    const payload = {
      iss: serviceAccountJson.client_email,
      sub: serviceAccountJson.client_email,
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600, // Token valid for 1 hour
      iat: now,
      scope: "https://www.googleapis.com/auth/cloud-platform"
    };
    
    // Import private key
    const key = await importPKCS8(serviceAccountJson.private_key, "RS256");
    
    // Create JWT
    const jwt = await create({ alg: "RS256", typ: "JWT" }, payload, key);
    
    return jwt;
  } catch (error) {
    console.error('[Vertex AI] JWT generation error:', error);
    throw new Error(`Failed to generate JWT: ${error.message}`);
  }
}

/**
 * Exchange JWT token for OAuth2 access token
 * 
 * @param jwt - JWT token
 * @returns Access token string
 */
async function exchangeJWTForAccessToken(jwt: string): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get access token: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

/**
 * Call Vertex AI (Gemini) API
 * 
 * @param systemInstruction - System prompt
 * @param userContent - User content (JSON string with proposal data)
 * @param serviceAccountJson - Service Account JSON object
 * @param projectId - Google Cloud Project ID
 * @param region - Google Cloud Region (e.g. "us-central1")
 * @returns EvaluationResult with ranked proposals
 */
export async function callVertexAI(
  systemInstruction: string,
  userContent: string,
  serviceAccountJson: any,
  projectId: string,
  region: string
): Promise<EvaluationResult> {
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash';
  
  console.log('[Evaluate] Using Vertex AI (Gemini)');
  console.log('[Evaluate] Model:', model);
  console.log('[Evaluate] Project ID:', projectId);
  console.log('[Evaluate] Region:', region);
  
  // Get access token (cached or new)
  const accessToken = await getCachedAccessToken(serviceAccountJson);
  
  const aiEndpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${model}:generateContent`;
  
  console.log('[Evaluate] Endpoint:', aiEndpoint);
  
  // Vertex AI payload format
  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: userContent }]
      }
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.0, // Deterministic output
      topK: 1,
      topP: 0.95,
      maxOutputTokens: 8192,
      responseMimeType: "application/json" // Force JSON output
    }
  };

  console.log('[Evaluate] Calling Vertex AI API...');
  
  const response = await fetch(aiEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Evaluate] Vertex AI API error:', response.status, errorText);
    throw new Error(`AI API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const result = await response.json();
  console.log('[Evaluate] Vertex AI response received');

  // Extract JSON from Vertex AI response
  const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!jsonText) {
    console.error('[Evaluate] No content in Vertex AI response:', JSON.stringify(result).substring(0, 500));
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
