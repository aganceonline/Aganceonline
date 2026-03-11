// Supabase Edge Function for translating text via Google Cloud Translation API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, target_lang = 'ar' } = await req.json()

    // Validate input
    if (!text || (Array.isArray(text) && text.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'Missing or empty "text" parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('GOOGLE_TRANSLATE_API_KEY')
    if (!apiKey) {
      console.error('Missing GOOGLE_TRANSLATE_API_KEY')
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing API Key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Google Translate API Endpoint (v2)
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`

    const requestBody = {
      q: text, // Can be string or array of strings
      target: target_lang,
      format: 'text'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Google API Error:', data)
      throw new Error(data.error?.message || 'Failed to translate text')
    }

    let translatedText;
    if (Array.isArray(text)) {
        translatedText = data.data.translations.map((t: any) => t.translatedText);
    } else {
        translatedText = data.data.translations[0].translatedText;
    }

    return new Response(
      JSON.stringify({ translatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Edge Function Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
