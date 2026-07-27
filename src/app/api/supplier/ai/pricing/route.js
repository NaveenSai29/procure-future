import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

async function getSupplierId(userId) {
  const staff = await prisma.supplierStaff.findFirst({ where: { userId } });
  if (staff) return staff.supplierId;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (user) {
    const supplier = await prisma.supplier.findFirst({ where: { email: user.email } });
    if (supplier) return supplier.id;
  }
  return null;
}

export async function POST(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const supplierId = await getSupplierId(session.userId);
    if (!supplierId) return errorResponse("Supplier not found", 403);

    const body = await req.json();
    const { productId, categoryId, currentPrice } = body;

    // Get market data
    const where = { supplierId: { not: supplierId }, isActive: true, isApproved: true };
    if (categoryId) where.categoryId = categoryId;

    const marketProducts = await prisma.product.findMany({
      where,
      include: {
        pricing: { where: { priceType: "RETAIL" }, select: { mrp: true, sellingPrice: true } },
        category: { select: { name: true } },
      },
      take: 50,
    });

    let avgMrp = 0, avgSelling = 0, minPrice = Infinity, maxPrice = 0, count = 0;
    const competitorPrices = [];

    marketProducts.forEach(p => {
      p.pricing.forEach(pr => {
        if (pr.sellingPrice > 0) {
          avgSelling += pr.sellingPrice;
          competitorPrices.push(pr.sellingPrice);
          if (pr.sellingPrice < minPrice) minPrice = pr.sellingPrice;
          if (pr.sellingPrice > maxPrice) maxPrice = pr.sellingPrice;
        }
        if (pr.mrp > 0) avgMrp += pr.mrp;
        count++;
      });
    });

    if (count > 0) {
      avgMrp = avgMrp / count;
      avgSelling = avgSelling / count;
    }

    competitorPrices.sort((a, b) => a - b);
    const medianPrice = competitorPrices.length > 0 
      ? competitorPrices[Math.floor(competitorPrices.length / 2)] 
      : 0;

    // Get product details if productId provided
    let productName = "";
    let productStats = null;
    if (productId) {
      const product = await prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
      if (product) productName = product.name;

      const orders = await prisma.order.findMany({
        where: { productId, status: "DELIVERED" },
        orderBy: { createdAt: "desc" }, take: 30,
      });
      if (orders.length > 0) {
        const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
        productStats = {
          totalSold: orders.length,
          totalRevenue,
          avgOrderValue: totalRevenue / orders.length,
          lastSold: orders[0]?.createdAt,
        };
      }
    }

    // Call OpenAI for smart pricing recommendation
    let aiRecommendation = "";
    let suggestedPrice = Math.round(avgSelling || currentPrice || 0);
    let confidence = "medium";
    let insights = [];

    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-your-key-here" && process.env.OPENAI_API_KEY !== "your-api-key") {
      try {
        const prompt = `You are a B2B procurement pricing expert. Analyze this product and market data to recommend optimal pricing.

Product: ${productName || "Unknown"}
Current Price: ₹${currentPrice || "Not set"}
Category: ${marketProducts[0]?.category?.name || "General"}
Market Data:
- Comparable products found: ${marketProducts.length}
- Average market price: ₹${avgSelling.toFixed(0)}
- Median market price: ₹${medianPrice.toFixed(0)}
- Price range: ₹${minPrice < Infinity ? minPrice.toFixed(0) : 0} - ₹${maxPrice.toFixed(0)}
- Number of competitors: ${marketProducts.length}
${productStats ? `- Units sold: ${productStats.totalSold}\n- Average order value: ₹${productStats.avgOrderValue.toFixed(0)}` : ""}

Provide pricing recommendation in JSON format:
{
  "recommendedPrice": number,
  "strategy": "short recommendation (1-2 sentences)",
  "confidence": "high/medium/low",
  "insights": ["insight 1", "insight 2", "insight 3"]
}`;

        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "You are a B2B pricing strategist. Provide data-driven pricing recommendations. Always respond in valid JSON." },
              { role: "user", content: prompt },
            ],
            temperature: 0.5,
            max_tokens: 400,
          }),
        });

        if (openaiRes.ok) {
          const aiData = await openaiRes.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          try {
            const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            suggestedPrice = parsed.recommendedPrice || suggestedPrice;
            aiRecommendation = parsed.strategy || "";
            confidence = parsed.confidence || "medium";
            insights = parsed.insights || [];
          } catch {
            aiRecommendation = content;
          }
        }
      } catch (aiError) {
        console.error("OpenAI pricing error:", aiError);
      }
    }

    // Fallback: rule-based recommendation if no OpenAI or API failed
    if (!aiRecommendation) {
      if (currentPrice && avgSelling > 0) {
        const diff = ((currentPrice - avgSelling) / avgSelling) * 100;
        if (diff > 20) {
          aiRecommendation = "Your price is significantly above market average. Consider reducing to stay competitive.";
          suggestedPrice = Math.round(avgSelling * 1.1);
          confidence = "high";
        } else if (diff > 5) {
          aiRecommendation = "Your price is slightly above market. Monitor competitor pricing closely.";
          suggestedPrice = Math.round(avgSelling * 1.05);
        } else if (diff < -20) {
          aiRecommendation = "Your price is well below market. You may be able to increase margins.";
          suggestedPrice = Math.round(avgSelling * 0.95);
          confidence = "high";
        } else {
          aiRecommendation = "Your pricing is competitive and aligned with the market.";
          suggestedPrice = currentPrice;
          confidence = "high";
        }
      } else if (avgSelling > 0) {
        aiRecommendation = "Based on market data, this is the recommended starting price.";
        suggestedPrice = Math.round(avgSelling);
      } else {
        aiRecommendation = "No comparable products found in the market. Set a competitive price based on your costs.";
        confidence = "low";
      }
    }

    if (insights.length === 0) {
      if (marketProducts.length > 0) insights.push(`Found ${marketProducts.length} similar products in the market`);
      if (avgSelling > 0) insights.push(`Average market selling price: ₹${avgSelling.toFixed(0)}`);
      if (minPrice < Infinity && maxPrice > 0) insights.push(`Price range: ₹${minPrice.toFixed(0)} - ₹${maxPrice.toFixed(0)}`);
      if (marketProducts.length < 5) insights.push("Limited competition - opportunity to capture market share");
    }

    return successResponse({
      recommendation: aiRecommendation,
      suggestedPrice,
      confidence,
      marketData: {
        comparableProducts: marketProducts.length,
        avgMrp: Math.round(avgMrp),
        avgSellingPrice: Math.round(avgSelling),
        medianPrice: Math.round(medianPrice),
        minPrice: minPrice < Infinity ? Math.round(minPrice) : 0,
        maxPrice: Math.round(maxPrice),
      },
      productStats,
      insights,
      aiPowered: !!aiRecommendation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI Pricing error:", error);
    return errorResponse("Failed to generate pricing insights", 500);
  }
}