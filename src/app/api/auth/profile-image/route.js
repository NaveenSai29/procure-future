import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return errorResponse("Not authenticated", 401);
    }

    const formData = await request.formData();
    const file = formData.get("image");

    if (!file) {
      return errorResponse("No image file provided", 400);
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      return errorResponse("Invalid file type. Only JPEG, PNG, and WebP are allowed.", 400);
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return errorResponse("File too large. Maximum size is 5MB.", 400);
    }

    // Create profiles upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), "public", "uploads", "profiles");
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${session.userId}-${Date.now()}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    // Update user profile image
    const profileImageUrl = `/uploads/profiles/${filename}`;
    await prisma.user.update({
      where: { id: session.userId },
      data: { profileImage: profileImageUrl },
    });

    return successResponse({
      profileImage: profileImageUrl,
      message: "Profile image updated successfully",
    });
  } catch (error) {
    console.error("Profile image upload error:", error);
    return errorResponse("Failed to upload profile image", 500);
  }
}