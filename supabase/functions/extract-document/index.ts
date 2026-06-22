import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })

    // Convert file to base64
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
    const base64 = btoa(binary)

    // Determine media type
    const mediaType = file.type.startsWith('image/') ? file.type : 'image/jpeg'
    const isPdf = file.type === 'application/pdf'

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY secret not configured')

    const prompt = `You are an accounting document parser. Extract all relevant financial information from this document image/PDF.

Return ONLY a valid JSON object with these exact fields (use null for missing fields):
{
  "document_type": "invoice" | "bill" | "receipt" | "purchase_order" | "credit_note" | "other",
  "vendor_name": string | null,
  "vendor_tpin": string | null,
  "vendor_address": string | null,
  "vendor_email": string | null,
  "client_name": string | null,
  "reference_number": string | null,
  "issue_date": "YYYY-MM-DD" | null,
  "due_date": "YYYY-MM-DD" | null,
  "currency": "ZMW" | "USD" | "GBP" | "EUR" | "ZAR" | string,
  "subtotal": number | null,
  "tax_amount": number | null,
  "total": number | null,
  "tax_rate": number | null,
  "notes": string | null,
  "line_items": [
    { "description": string, "quantity": number, "unit_price": number, "tax_rate": number, "amount": number }
  ],
  "confidence": "high" | "medium" | "low"
}

Rules:
- Dates must be in YYYY-MM-DD format. Convert any other date format.
- All monetary values should be plain numbers (no currency symbols).
- If the document is in Zambian Kwacha (K or ZMW), set currency to "ZMW".
- Return ONLY the JSON object, no markdown, no explanation.`

    const content = isPdf
      ? [{ type: 'text', text: `${prompt}\n\nNote: This appears to be a PDF. Extract what you can from the document content.` }]
      : [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: prompt },
        ]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Anthropic API error: ${err}`)
    }

    const result = await response.json()
    const text = result.content[0].text.trim()

    // Parse and validate JSON
    const extracted = JSON.parse(text)

    return new Response(JSON.stringify({ success: true, data: extracted }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
