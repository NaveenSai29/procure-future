import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function POST(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: session.userId },
    });
    if (!staff) return errorResponse("No supplier account found", 404);

    const body = await req.json();
    const { type, productName, category, keywords, existingDescription } = body;

    if (!type || !productName) {
      return errorResponse("Type and productName are required", 400);
    }

    let prompt = "";
    const categoryName = category || "general products";

    switch (type) {
      case "description":
        prompt = `Write a professional, SEO-friendly product description for an e-commerce procurement platform. 
Product Name: ${productName}
Category: ${categoryName}
${keywords ? `Keywords to include: ${keywords}` : ""}
${existingDescription ? `Current description to improve: ${existingDescription}` : ""}

Requirements:
- Write 2-3 paragraphs (150-250 words total)
- Professional B2B tone
- Include key features and benefits
- Mention common applications/use cases
- Include relevant industry keywords naturally
- Format in plain text (no markdown)`;
        break;

      case "highlights":
        prompt = `Generate 5-7 key highlights/bullet points for a product on a B2B procurement platform.
Product Name: ${productName}
Category: ${categoryName}
${existingDescription ? `Product description: ${existingDescription}` : ""}

Requirements:
- Each point should be a single line
- Focus on specifications, benefits, and unique features
- Professional tone
- Start each point with a dash (-)
- Include measurable specs where relevant`;
        break;

      case "meta":
        prompt = `Generate SEO meta title and meta description for a product on a B2B procurement platform.
Product Name: ${productName}
Category: ${categoryName}
${existingDescription ? `Product description: ${existingDescription}` : ""}

Requirements:
- Meta Title: 50-60 characters, include product name and 1-2 keywords, compelling for B2B buyers
- Meta Description: 140-160 characters, summarize product value proposition, include call-to-action

Respond in JSON format:
{
  "metaTitle": "...",
  "metaDescription": "..."
}`;
        break;

      case "specifications":
        prompt = `Generate a list of typical technical specifications for this product on a B2B procurement platform.
Product Name: ${productName}
Category: ${categoryName}

Respond in JSON format as key-value pairs:
{
  "specName1": "specValue1",
  "specName2": "specValue2"
}`;
        break;

      default:
        return errorResponse("Invalid type. Use: description, highlights, meta, specifications", 400);
    }

    // Call OpenAI API
    let generatedContent = "";
    
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your-api-key") {
      try {
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "You are a professional B2B product content writer for a procurement platform. Write clear, accurate, and SEO-optimized content." },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: type === "meta" ? 200 : 500,
          }),
        });

        if (!openaiRes.ok) {
          const errData = await openaiRes.json().catch(() => ({}));
          throw new Error(errData.error?.message || `OpenAI API error: ${openaiRes.status}`);
        }

        const openaiData = await openaiRes.json();
        generatedContent = openaiData.choices?.[0]?.message?.content || "";
      } catch (aiError) {
        console.error("OpenAI API error:", aiError);
        return errorResponse(`AI generation failed: ${aiError.message}. Check your OpenAI API key.`, 500);
      }
    } else {
      // Fallback: Generate template content if no API key
      generatedContent = generateFallbackContent(type, productName, categoryName);
    }

    // Parse response based on type
    let result = {};
    
    if (type === "meta") {
      try {
        // Try to parse JSON from AI response
        const cleaned = generatedContent.replace(/```json\n?|\n?```/g, "").trim();
        result = JSON.parse(cleaned);
      } catch {
        // Fallback parsing
        const lines = generatedContent.split("\n").filter(Boolean);
        result.metaTitle = lines.find(l => l.toLowerCase().includes("meta title"))?.replace(/.*?:/, "").trim() || `${productName} - Best Price Online | PROCURE`;
        result.metaDescription = lines.find(l => l.toLowerCase().includes("meta description"))?.replace(/.*?:/, "").trim() || `Buy ${productName} at the best price on PROCURE. ✓ Best Quality ✓ Fast Delivery ✓ Best Price. Order now!`;
      }
    } else if (type === "specifications") {
      try {
        const cleaned = generatedContent.replace(/```json\n?|\n?```/g, "").trim();
        result = JSON.parse(cleaned);
      } catch {
        result = { error: "Could not parse specifications" };
      }
    } else {
      result = { content: generatedContent.trim() };
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "AI_GENERATION_USED",
        entity: "Product",
        newValue: { type, productName, category: categoryName },
      },
    });

    return successResponse(result);
  } catch (error) {
    console.error("AI generate error:", error);
    return errorResponse(error.message || "AI generation failed", 500);
  }
}

// Fallback content generator when no OpenAI API key
function generateFallbackContent(type, productName, category) {
  const templates = {
    description: `${productName} is a premium quality product designed for professional and industrial use. Manufactured to meet the highest industry standards, this product delivers exceptional performance, durability, and reliability.

Whether you're sourcing for retail, wholesale, or industrial applications, ${productName} offers the perfect balance of quality and value. It is built using high-grade materials and undergoes rigorous quality checks to ensure consistent performance.

Key applications include use in ${category} operations, commercial setups, and large-scale projects. Backed by our commitment to quality, ${productName} comes with comprehensive support and competitive pricing.

Order ${productName} today on PROCURE and experience seamless B2B procurement with fast delivery and dedicated customer support.`,

    highlights: `- Premium quality ${category} product
- Manufactured to industry standards
- High durability and reliable performance
- Suitable for professional and industrial use
- Competitive wholesale pricing available
- Fast delivery across all locations
- Quality checked and certified`,

  };

  if (type === "meta") {
    return JSON.stringify({
      metaTitle: `Buy ${productName} Online - Best Price | PROCURE`,
      metaDescription: `Shop ${productName} at best price on PROCURE. ✓ Premium Quality ✓ Fast Delivery ✓ Bulk Orders Welcome. Order now!`,
    });
  }

  if (type === "specifications") {
    return JSON.stringify({
      "Material": "High Grade",
      "Brand": "Premium",
      "Usage": category,
      "Packaging": "Standard Industrial Packaging",
    });
  }

  return templates[type] || `${productName} - Premium ${category} product available on PROCURE.`;
}