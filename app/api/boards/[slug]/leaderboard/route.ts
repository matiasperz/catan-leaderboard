import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

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

    // Get all player data for this board
    const playerKeys = await redis.keys(`board:${slug}:player:*`)
    const players = []

    for (const key of playerKeys) {
      const playerData = await redis.hgetall(key)
      if (playerData) {
        const name = key.replace(`board:${slug}:player:`, "")
        const totalPoints = Number.parseInt(playerData.totalPoints as string) || 0
        const gamesPlayed = Number.parseInt(playerData.gamesPlayed as string) || 0
        const wins = Number.parseInt(playerData.wins as string) || 0

        players.push({
          name,
          totalPoints,
          gamesPlayed,
          wins,
          averagePoints: gamesPlayed > 0 ? totalPoints / gamesPlayed : 0,
        })
      }
    }

    // Sort by total points (descending)
    players.sort((a, b) => b.totalPoints - a.totalPoints)

    return NextResponse.json(players)
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 })
  }
} 