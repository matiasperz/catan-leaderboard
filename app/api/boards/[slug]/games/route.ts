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

    // Get all games for this board
    const gameKeys = await redis.keys(`board:${slug}:game:*`)
    const games = []

    for (const key of gameKeys) {
      const gameData = await redis.get(key)
      if (gameData) {
        games.push(gameData)
      }
    }

    // Sort by date (most recent first)
    games.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json(games)
  } catch (error) {
    console.error("Error fetching games:", error)
    return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 })
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

    const { players } = await request.json()

    if (!players || players.length < 2) {
      return NextResponse.json({ error: "At least 2 players required" }, { status: 400 })
    }

    // Find winner (highest points)
    const winner = players.reduce((prev: any, current: any) => (prev.points > current.points ? prev : current))

    // Create game record
    const gameId = `board:${slug}:game:${Date.now()}`
    const gameData = {
      id: gameId,
      date: new Date().toISOString(),
      players,
      winner: winner.name,
    }

    // Save game to Redis
    await redis.set(gameId, gameData)

    // Update player statistics
    for (const player of players) {
      const playerKey = `board:${slug}:player:${player.name}`

      // Get existing player data
      const existingData = (await redis.hgetall(playerKey)) || {}

      const currentTotalPoints = Number.parseInt(existingData.totalPoints as string) || 0
      const currentGamesPlayed = Number.parseInt(existingData.gamesPlayed as string) || 0
      const currentWins = Number.parseInt(existingData.wins as string) || 0

      // Update player data
      await redis.hset(playerKey, {
        totalPoints: currentTotalPoints + player.points,
        gamesPlayed: currentGamesPlayed + 1,
        wins: currentWins + (player.name === winner.name ? 1 : 0),
      })
    }

    return NextResponse.json({ success: true, gameId })
  } catch (error) {
    console.error("Error adding game:", error)
    return NextResponse.json({ error: "Failed to add game" }, { status: 500 })
  }
} 