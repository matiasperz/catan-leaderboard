"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Crown, Scroll, Plus, ArrowRight } from "lucide-react"

interface Board {
  name: string
  slug: string
  createdAt: string
}

export default function HomePage() {
  const router = useRouter()
  const [slug, setSlug] = useState("")
  const [showCreateBoard, setShowCreateBoard] = useState(false)
  const [newBoard, setNewBoard] = useState({
    name: "",
    slug: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const [boards, setBoards] = useState<Board[]>([])
  const [boardsLoading, setBoardsLoading] = useState(true)

  useEffect(() => {
    fetchBoards()
  }, [])

  const fetchBoards = async () => {
    try {
      const response = await fetch("/api/boards")
      if (response.ok) {
        const data = await response.json()
        setBoards(data)
      }
    } catch (error) {
      console.error("Failed to fetch boards:", error)
    } finally {
      setBoardsLoading(false)
    }
  }

  const handleJoinBoard = () => {
    if (!slug.trim()) {
      alert("Please enter a board slug")
      return
    }
    router.push(`/${slug.trim()}`)
  }

  const handleCreateBoard = async () => {
    if (!newBoard.name.trim() || !newBoard.slug.trim() || !newBoard.password.trim()) {
      alert("Please fill in all fields")
      return
    }

    // Validate slug format (alphanumeric and hyphens)
    const slugPattern = /^[a-z0-9-]+$/
    if (!slugPattern.test(newBoard.slug)) {
      alert("Slug can only contain lowercase letters, numbers, and hyphens")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBoard),
      })

      if (response.ok) {
        const data = await response.json()
        // Refresh the boards list
        fetchBoards()
        // Pass the password as a URL param for auto-authentication
        router.push(`/${data.slug}?auth=${encodeURIComponent(newBoard.password)}`)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to create board")
      }
    } catch (error) {
      console.error("Failed to create board:", error)
      alert("Failed to create board")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100">
      {/* Medieval Header */}
      <div className="bg-gradient-to-r from-amber-800 to-orange-900 text-white py-8 shadow-lg border-b-4 border-amber-600">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Crown className="w-12 h-12 text-yellow-300" />
            <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-wide">Catan Leaderboards</h1>
            <Crown className="w-12 h-12 text-yellow-300" />
          </div>
          <p className="text-xl font-serif text-amber-200">{"Create Your Own Kingdom or Join an Existing Realm"}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Join Existing Board */}
          <Card className="bg-gradient-to-b from-amber-50 to-orange-50 border-2 border-amber-300 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-amber-200 to-orange-200 border-b-2 border-amber-300">
              <CardTitle className="text-2xl font-serif text-amber-800 flex items-center gap-2">
                <ArrowRight className="w-6 h-6" />
                Join Existing Board
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label className="font-serif text-amber-800">Board Slug</Label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="border-amber-300 focus:border-amber-500"
                    placeholder="Enter board slug (e.g., my-catan-group)"
                    onKeyPress={(e) => e.key === "Enter" && handleJoinBoard()}
                  />
                  <p className="text-sm text-amber-600 mt-1">
                    Enter the unique slug for your board to access it
                  </p>
                </div>
                <Button
                  onClick={handleJoinBoard}
                  className="w-full bg-amber-700 hover:bg-amber-800 text-white font-serif text-lg py-3"
                >
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Join Board
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Create New Board */}
          <Card className="bg-gradient-to-b from-amber-50 to-orange-50 border-2 border-amber-300 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-amber-200 to-orange-200 border-b-2 border-amber-300">
              <CardTitle className="text-2xl font-serif text-amber-800 flex items-center gap-2">
                <Plus className="w-6 h-6" />
                Create New Board
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {!showCreateBoard ? (
                <div className="text-center">
                  <p className="text-amber-700 font-serif mb-4">
                    Start your own Catan leaderboard for your group
                  </p>
                  <Button
                    onClick={() => setShowCreateBoard(true)}
                    className="bg-green-700 hover:bg-green-800 text-white font-serif text-lg py-3 px-6"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create New Board
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="font-serif text-amber-800">Board Name</Label>
                    <Input
                      value={newBoard.name}
                      onChange={(e) => setNewBoard({ ...newBoard, name: e.target.value })}
                      className="border-amber-300 focus:border-amber-500"
                      placeholder="e.g., Weekend Warriors"
                    />
                  </div>
                  <div>
                    <Label className="font-serif text-amber-800">Board Slug</Label>
                    <Input
                      value={newBoard.slug}
                      onChange={(e) => setNewBoard({ ...newBoard, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                      className="border-amber-300 focus:border-amber-500"
                      placeholder="weekend-warriors"
                    />
                    <p className="text-sm text-amber-600 mt-1">
                      This will be your board's URL: /{newBoard.slug || "your-slug"}
                    </p>
                  </div>
                  <div>
                    <Label className="font-serif text-amber-800">Board Password</Label>
                    <Input
                      type="password"
                      value={newBoard.password}
                      onChange={(e) => setNewBoard({ ...newBoard, password: e.target.value })}
                      className="border-amber-300 focus:border-amber-500"
                      placeholder="Create a password for managing this board"
                    />
                    <p className="text-sm text-amber-600 mt-1">
                      Required to add games and manage players
                    </p>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleCreateBoard}
                      disabled={loading}
                      className="flex-1 bg-green-700 hover:bg-green-800 text-white font-serif"
                    >
                      {loading ? "Creating..." : "Create Board"}
                    </Button>
                    <Button
                      onClick={() => setShowCreateBoard(false)}
                      variant="outline"
                      className="flex-1 border-amber-300 text-amber-800 font-serif"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Section */}
          <Card className="bg-gradient-to-b from-blue-50 to-blue-100 border-2 border-blue-300 shadow-lg">
            <CardContent className="p-6 text-center">
              <Scroll className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-serif font-bold text-blue-800 mb-2">How It Works</h3>
              <div className="text-blue-700 space-y-2">
                <p>• Create a new board for your Catan group with a unique name and password</p>
                <p>• Share the board slug with your friends so they can view the leaderboard</p>
                <p>• Only you (with the password) can add games and manage player profiles</p>
                <p>• Each board has its own isolated leaderboard and game history</p>
              </div>
            </CardContent>
          </Card>

          {/* Latest Boards */}
          <Card className="bg-gradient-to-b from-green-50 to-green-100 border-2 border-green-300 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-200 to-green-300 border-b-2 border-green-400">
              <CardTitle className="text-2xl font-serif text-green-800 flex items-center gap-2">
                <Crown className="w-6 h-6" />
                Latest Boards
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {boardsLoading ? (
                <p className="text-center text-green-700 font-serif py-4">Loading boards...</p>
              ) : boards.length === 0 ? (
                <p className="text-center text-green-700 font-serif py-4">No boards created yet. Be the first!</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {boards.map((board) => (
                    <div
                      key={board.slug}
                      onClick={() => router.push(`/${board.slug}`)}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border-2 border-green-200 hover:border-green-400 hover:bg-green-50 cursor-pointer transition-all duration-200"
                    >
                      <div>
                        <h4 className="font-serif font-bold text-green-800">{board.name}</h4>
                        <p className="text-sm text-green-600">/{board.slug}</p>
                      </div>
                      <div className="text-right text-sm text-green-600">
                        {new Date(board.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
