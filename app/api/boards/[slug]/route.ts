import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
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

export async function DELETE(
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

    // Get all keys related to this board
    const boardKeys = await redis.keys(`board:${slug}:*`)
    
    if (boardKeys.length === 0) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    // Delete all board-related data
    for (const key of boardKeys) {
      await redis.del(key)
    }

    return NextResponse.json({ 
      success: true, 
      message: `Board "${slug}" and all associated data has been deleted` 
    })
  } catch (error) {
    console.error("Error deleting board:", error)
    return NextResponse.json({ error: "Failed to delete board" }, { status: 500 })
  }
} 