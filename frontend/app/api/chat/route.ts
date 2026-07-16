import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json();

    const systemPrompt = `You are Afritide's AI Trading Assistant — an expert in African agricultural markets, commodity trading, export requirements, and supply chain logistics.

You have access to live platform data injected below. Use it to give accurate, specific answers.

LIVE PLATFORM DATA:
${context?.commodities ? `
CURRENT COMMODITY PRICES:
${context.commodities.map((c: any) =>
  `- ${c.commodity_name}: ${c.currency} ${c.price} per ${c.unit} (${c.trend === 'UP' ? '📈' : c.trend === 'DOWN' ? '📉' : '→'} ${c.change_percentage ? Math.abs(c.change_percentage).toFixed(1) + '%' : 'stable'}) — ${c.market || 'Global'}`
).join('\n')}` : ''}

${context?.products ? `
AVAILABLE PRODUCTS ON PLATFORM:
${context.products.slice(0, 20).map((p: any) =>
  `- ${p.title}: ${p.currency} ${p.price} per ${p.unit} | Qty: ${p.quantity_available} | Location: ${p.city || ''} ${p.country || ''} | ${p.is_organic ? 'Organic' : ''} ${p.is_export_ready ? 'Export Ready' : ''}`
).join('\n')}` : ''}

USER CONTEXT:
- Role: ${context?.userRole || 'Visitor'}
- Country: ${context?.userCountry || 'Unknown'}
- Platform: Afritide Agriculture Marketplace (www.afritidegroup.com)

GUIDELINES:
- Be concise, practical, and specific to African agricultural trade
- When recommending suppliers or products, reference actual platform listings above
- For transport costs, use knowledge of Nigerian and African road/rail networks
- For export requirements, be specific about documentation (phytosanitary, NAFDAC, SON, etc.)
- Always suggest next steps the user can take on Afritide
- Format responses clearly with bullet points or short paragraphs
- Never make up prices — only use the live data provided above
- If asked about something outside agricultural trade, politely redirect`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":         "application/json",
        "x-api-key":            process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version":    "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 1024,
        system:     systemPrompt,
        messages:   messages.map((m: any) => ({
          role:    m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error: error.error?.message || "AI error" }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || "I couldn't generate a response. Please try again.";

    return NextResponse.json({ reply });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}