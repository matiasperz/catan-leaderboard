import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { put } from "@vercel/blob"
import bcrypt from "bcryptjs"

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

async function verifyAuth(slug: string, authHeader: string): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  const password = authHeader.substring(7)
  const boardData = await redis.get(`board:${slug}:info`)
  if (!boardData) return false

  const board = boardData as any
  return await bcrypt.compare(password, board.password)
}

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    // Check if board exists
    const boardData = await redis.get(`board:${slug}:info`)
    if (!boardData) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    // Get all player profile images for this board
    const profileKeys = await redis.keys(`board:${slug}:profile:*`)
    const profiles: Record<string, string> = {}

    for (const key of profileKeys) {
      const imageUrl = await redis.get(key)
      if (imageUrl) {
        const playerName = key.replace(`board:${slug}:profile:`, "")
        profiles[playerName] = imageUrl as string
      }
    }

    return NextResponse.json(profiles)
  } catch (error) {
    console.error("Error fetching player profiles:", error)
    return NextResponse.json({ error: "Failed to fetch player profiles" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const authHeader = request.headers.get('Authorization') || ''

    // Verify authentication
    const isAuthenticated = await verifyAuth(slug, authHeader)
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const image = formData.get("image") as File
    const playerName = formData.get("playerName") as string

    if (!image || !playerName) {
      return NextResponse.json({ error: "Image and player name required" }, { status: 400 })
    }

    // Validate file type (images and videos)
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/mov', 'video/avi', 'video/webm', 'video/quicktime'
    ]
    
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json({ 
        error: `Unsupported file type: ${image.type}. Supported types: images (JPEG, PNG, WebP, GIF) and videos (MP4, MOV, AVI, WebM)` 
      }, { status: 400 })
    }

    // Check file size (50MB limit for better UX)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (image.size > maxSize) {
      return NextResponse.json({ 
        error: "File too large. Maximum size is 50MB." 
      }, { status: 400 })
    }

    // Upload image to Vercel Blob
    const filename = `profile-${slug}-${playerName}-${Date.now()}.${image.name.split('.').pop()}`
    const blob = await put(filename, image, {
      access: 'public',
    })

    // Store the blob URL in Redis with board and player name as key
    const profileKey = `board:${slug}:profile:${playerName}`
    await redis.set(profileKey, blob.url)

    return NextResponse.json({
      success: true,
      imageUrl: blob.url,
      playerName,
    })
  } catch (error) {
    console.error("Error uploading player profile:", error)
    return NextResponse.json({ error: "Failed to upload profile image" }, { status: 500 })
  }
} 