import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import bcrypt from "bcryptjs"

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { password } = await request.json()
    const { slug } = params

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 })
    }

    // Get board info
    const boardData = await redis.get(`board:${slug}:info`)
    if (!boardData) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    const board = boardData as any
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, board.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    return NextResponse.json({ success: true, message: "Authentication successful" })
  } catch (error) {
    console.error("Error authenticating:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
} 