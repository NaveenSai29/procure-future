import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

async function scanDirectory(dirPath, entityType) {
  const results = [];
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(path.join(process.cwd(), "public"), fullPath).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        const subResults = await scanDirectory(fullPath, entityType);
        results.push(...subResults);
      } else if (entry.isFile()) {
        try {
          const stat = await fs.stat(fullPath);
          const ext = path.extname(entry.name).toLowerCase();
          let fileType = "application/octet-stream";
          if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"].includes(ext)) {
            fileType = "image/" + ext.slice(1);
          } else if (ext === ".pdf") {
            fileType = "application/pdf";
          }

          results.push({
            fileName: entry.name,
            originalName: entry.name,
            fileUrl: "/" + relativePath,
            fileType,
            fileSize: stat.size,
            entityType,
          });
        } catch (err) {
          console.error(`Error reading file ${fullPath}:`, err.message);
        }
      }
    }
  } catch (err) {
    // Directory doesn't exist - that's fine
    if (err.code !== "ENOENT") {
      console.error(`Error scanning ${dirPath}:`, err.message);
    }
  }
  return results;
}

export async function POST() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const publicDir = path.join(process.cwd(), "public", "uploads");
    let allFiles = [];

    // Scan KYC files
    const kycDir = path.join(publicDir, "kyc");
    const kycFiles = await scanDirectory(kycDir, "KYC");
    allFiles.push(...kycFiles);

    // Scan product images
    const productsDir = path.join(publicDir, "products");
    const productFiles = await scanDirectory(productsDir, "PRODUCT");
    allFiles.push(...productFiles);

    // Scan variant images
    const variantsDir = path.join(publicDir, "variants");
    const variantFiles = await scanDirectory(variantsDir, "VARIANT");
    allFiles.push(...variantFiles);

    // Scan banners folder (may not exist)
    const bannersDir = path.join(publicDir, "banners");
    const bannerFiles = await scanDirectory(bannersDir, "BANNER");
    allFiles.push(...bannerFiles);

    // Scan categories folder (may not exist)
    const categoriesDir = path.join(publicDir, "categories");
    const categoryFiles = await scanDirectory(categoriesDir, "CATEGORY");
    allFiles.push(...categoryFiles);

    // Scan brands folder (may not exist)
    const brandsDir = path.join(publicDir, "brands");
    const brandFiles = await scanDirectory(brandsDir, "BRAND");
    allFiles.push(...brandFiles);

    // Scan general uploads
    const generalDir = publicDir;
    try {
      const entries = await fs.readdir(generalDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) {
          const fullPath = path.join(generalDir, entry.name);
          const stat = await fs.stat(fullPath);
          const ext = path.extname(entry.name).toLowerCase();
          let fileType = "application/octet-stream";
          if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext)) {
            fileType = "image/" + ext.slice(1);
          } else if (ext === ".pdf") {
            fileType = "application/pdf";
          }
          allFiles.push({
            fileName: entry.name,
            originalName: entry.name,
            fileUrl: "/uploads/" + entry.name,
            fileType,
            fileSize: stat.size,
            entityType: "GENERAL",
          });
        }
      }
    } catch {}

    // Insert into Media table (skip duplicates)
    let inserted = 0;
    let skipped = 0;

    for (const file of allFiles) {
      try {
        const existing = await prisma.media.findFirst({
          where: { fileUrl: file.fileUrl },
        });
        if (!existing) {
          await prisma.media.create({ data: file });
          inserted++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`Error inserting ${file.fileUrl}:`, err.message);
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "MEDIA_SCAN",
        entity: "Media",
        newValue: { totalFound: allFiles.length, inserted, skipped },
      },
    });

    return successResponse({
      message: `Scan complete: ${inserted} new files added, ${skipped} already existed, ${allFiles.length} total found`,
      totalFound: allFiles.length,
      inserted,
      skipped,
    });
  } catch (error) {
    console.error("Media scan error:", error);
    return errorResponse("Failed to scan media: " + error.message, 500);
  }
}