import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import bcrypt from "bcryptjs"

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export async function POST(request: Request) {
  try {
    const { name, slug, password } = await request.json()

    if (!name || !slug || !password) {
      return NextResponse.json({ error: "Name, slug, and password are required" }, { status: 400 })
    }

    // Validate slug format
    const slugPattern = /^[a-z0-9-]+$/
    if (!slugPattern.test(slug)) {
      return NextResponse.json({ 
        error: "Slug can only contain lowercase letters, numbers, and hyphens" 
      }, { status: 400 })
    }

    // Check if board with this slug already exists
    const existingBoard = await redis.get(`board:${slug}:info`)
    if (existingBoard) {
      return NextResponse.json({ error: "A board with this slug already exists" }, { status: 400 })
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create board info
    const boardData = {
      name,
      slug,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    }

    // Save board info to Redis
    await redis.set(`board:${slug}:info`, boardData)

    return NextResponse.json({ 
      success: true, 
      slug,
      name,
      message: "Board created successfully" 
    })
  } catch (error) {
    console.error("Error creating board:", error)
    return NextResponse.json({ error: "Failed to create board" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (slug) {
      // Get specific board by slug
      const boardData = await redis.get(`board:${slug}:info`)
      if (!boardData) {
        return NextResponse.json({ error: "Board not found" }, { status: 404 })
      }

      // Return board info without password
      const { password, ...boardInfo } = boardData as any
      return NextResponse.json(boardInfo)
    } else {
      // Get all boards
      const boardKeys = await redis.keys("board:*:info")
      const boards = []

      for (const key of boardKeys) {
        const boardData = await redis.get(key)
        if (boardData) {
          const { password, ...boardInfo } = boardData as any
          boards.push(boardInfo)
        }
      }

      // Sort by creation date (most recent first)
      boards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      return NextResponse.json(boards)
    }
  } catch (error) {
    console.error("Error fetching boards:", error)
    return NextResponse.json({ error: "Failed to fetch boards" }, { status: 500 })
  }
} 