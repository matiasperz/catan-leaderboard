"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Crown, Sword, Shield, Plus, Trophy, Scroll, ArrowLeft, Lock, Settings, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface Player {
  name: string
  totalPoints: number
  gamesPlayed: number
  wins: number
  averagePoints: number
}

interface GameResult {
  id: string
  date: string
  players: { name: string; points: number }[]
  winner: string
}

interface BoardInfo {
  name: string
  slug: string
  createdAt: string
}

export default function BoardPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [boardInfo, setBoardInfo] = useState<BoardInfo | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [games, setGames] = useState<GameResult[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddGame, setShowAddGame] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [newGame, setNewGame] = useState({
    player1: { name: "", points: 0 },
    player2: { name: "", points: 0 },
    player3: { name: "", points: 0 },
    player4: { name: "", points: 0 },
  })
  const [showPlayerManager, setShowPlayerManager] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState("")
  const [playerProfiles, setPlayerProfiles] = useState<Record<string, string>>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Helper function to determine if URL is a video
  const isVideoUrl = (url: string) => {
    return url.match(/\.(mp4|mov|avi|webm|quicktime)(\?|$)/i)
  }

  // Helper component to render media (image or video)
  const MediaDisplay = ({ src, alt, className }: { src: string, alt: string, className: string }) => {
    if (isVideoUrl(src)) {
      return (
        <video
          src={src}
          className={className}
          controls={false}
          autoPlay
          loop
          muted
          playsInline
        />
      )
    }
    return (
      <img
        src={src || "/placeholder.svg"}
        alt={alt}
        className={className}
      />
    )
  }

  useEffect(() => {
    fetchBoardInfo()
    fetchLeaderboard()
    fetchGames()
    fetchPlayerProfiles()

    // Check for auto-authentication parameter
    const urlParams = new URLSearchParams(window.location.search)
    const authPassword = urlParams.get('auth')
    if (authPassword) {
      // Auto-authenticate with the provided password
      setPassword(authPassword)
      handleAuthWithPassword(authPassword)
      
      // Clean up the URL by removing the auth parameter
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [slug])

  const fetchBoardInfo = async () => {
    try {
      const response = await fetch(`/api/boards?slug=${slug}`)
      if (response.ok) {
        const data = await response.json()
        setBoardInfo(data)
      } else if (response.status === 404) {
        router.push('/')
      }
    } catch (error) {
      console.error("Failed to fetch board info:", error)
    }
  }

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/api/boards/${slug}/leaderboard`)
      if (response.ok) {
        const data = await response.json()
        setPlayers(data)
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchGames = async () => {
    try {
      const response = await fetch(`/api/boards/${slug}/games`)
      if (response.ok) {
        const data = await response.json()
        setGames(data)
      }
    } catch (error) {
      console.error("Failed to fetch games:", error)
    }
  }

  const fetchPlayerProfiles = async () => {
    try {
      const response = await fetch(`/api/boards/${slug}/player-profiles`)
      if (response.ok) {
        const data = await response.json()
        setPlayerProfiles(data)
      }
    } catch (error) {
      console.error("Failed to fetch player profiles:", error)
    }
  }

  const handleAuthWithPassword = async (authPassword: string) => {
    try {
      const response = await fetch(`/api/boards/${slug}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: authPassword }),
      })

      if (response.ok) {
        setIsAuthenticated(true)
        setShowAuth(false)
        setPassword(authPassword)
        // Don't clear the password - we need it for subsequent API calls
      } else {
        alert("Incorrect password")
      }
    } catch (error) {
      console.error("Failed to authenticate:", error)
      alert("Authentication failed")
    }
  }

  const handleAuth = async () => {
    await handleAuthWithPassword(password)
  }

  const handleDeleteBoard = async () => {
    if (!isAuthenticated) {
      setShowAuth(true)
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/boards/${slug}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${password}`,
        },
      })

      if (response.ok) {
        alert("Board deleted successfully!")
        router.push('/')
      } else if (response.status === 401) {
        alert("Authentication failed. Please re-enter your password.")
        setIsAuthenticated(false)
        setShowAuth(true)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to delete board")
      }
    } catch (error) {
      console.error("Failed to delete board:", error)
      alert("Failed to delete board")
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleImageUpload = async (playerName: string, file: File) => {
    if (!isAuthenticated) {
      setShowAuth(true)
      return
    }

    const formData = new FormData()
    formData.append("image", file)
    formData.append("playerName", playerName)

    try {
      const response = await fetch(`/api/boards/${slug}/player-profiles`, {
        method: "POST",
        body: formData,
        headers: {
          'Authorization': `Bearer ${password}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPlayerProfiles((prev) => ({
          ...prev,
          [playerName]: data.imageUrl,
        }))
      } else if (response.status === 401) {
        alert("Authentication failed. Please re-enter your password.")
        setIsAuthenticated(false)
        setShowAuth(true)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to upload image")
      }
    } catch (error) {
      console.error("Failed to upload image:", error)
      alert("Failed to upload image")
    }
  }

  const handleAddGame = async () => {
    if (!isAuthenticated) {
      setShowAuth(true)
      return
    }

    const gameData = {
      players: [
        { name: newGame.player1.name, points: newGame.player1.points },
        { name: newGame.player2.name, points: newGame.player2.points },
        { name: newGame.player3.name, points: newGame.player3.points },
        { name: newGame.player4.name, points: newGame.player4.points },
      ].filter((p) => p.name.trim() !== ""),
    }

    if (gameData.players.length < 2) {
      alert("Please add at least 2 players")
      return
    }

    // Catan-specific validation
    const playersWithTenPoints = gameData.players.filter((p) => p.points === 10)
    const playersWithMoreThanTen = gameData.players.filter((p) => p.points > 10)

    if (playersWithMoreThanTen.length > 0) {
      alert("Invalid points! In Catan, no player can have more than 10 points.")
      return
    }

    if (playersWithTenPoints.length === 0) {
      alert("Invalid game! In Catan, exactly one player must have 10 points to win.")
      return
    }

    if (playersWithTenPoints.length > 1) {
      alert("Invalid game! Only one player can have 10 points (the winner).")
      return
    }

    try {
      const response = await fetch(`/api/boards/${slug}/games`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${password}`,
        },
        body: JSON.stringify(gameData),
      })

      if (response.ok) {
        setNewGame({
          player1: { name: "", points: 0 },
          player2: { name: "", points: 0 },
          player3: { name: "", points: 0 },
          player4: { name: "", points: 0 },
        })
        setShowAddGame(false)
        fetchLeaderboard()
        fetchGames()
      } else if (response.status === 401) {
        alert("Authentication failed. Please re-enter your password.")
        setIsAuthenticated(false)
        setShowAuth(true)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to add game")
      }
    } catch (error) {
      console.error("Failed to add game:", error)
      alert("Failed to add game")
    }
  }

  const currentChampion = players.length > 0 ? players[0] : null

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <Scroll className="w-12 h-12 text-amber-700 mx-auto mb-4 animate-spin" />
          <p className="text-amber-800 font-serif">Loading the realm...</p>
        </div>
      </div>
    )
  }

  if (!boardInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-amber-800 mb-4">Board not found</h1>
          <Link href="/">
            <Button className="bg-amber-700 hover:bg-amber-800 text-white font-serif">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100">
      {/* Medieval Header */}
      <div className="bg-gradient-to-r from-amber-800 to-orange-900 text-white py-8 shadow-lg border-b-4 border-amber-600">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <Link href="/">
              <Button variant="ghost" className="text-white hover:bg-amber-700 font-serif">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center justify-center gap-4">
              <Crown className="w-12 h-12 text-yellow-300" />
              <div className="text-center">
                <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-wide">{boardInfo.name}</h1>
                <p className="text-xl font-serif text-amber-200">Catan Leaderboard</p>
              </div>
              <Crown className="w-12 h-12 text-yellow-300" />
            </div>
            <Button 
              onClick={() => {
                if (isAuthenticated) {
                  setIsAuthenticated(false)
                  setPassword("")
                } else {
                  setShowAuth(true)
                }
              }}
              variant="ghost" 
              className="text-white hover:bg-amber-700 font-serif"
            >
              <Settings className="w-4 h-4 mr-2" />
              {isAuthenticated ? "Logout" : "Login"}
            </Button>
          </div>
          <div className="text-center">
            <p className="text-lg font-serif text-amber-200">
              Board: /{slug} • Created {new Date(boardInfo.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Current Champion Banner */}
        {currentChampion && (
          <Card className="mb-8 bg-gradient-to-r from-yellow-100 to-amber-100 border-4 border-yellow-500 shadow-xl">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-4 mb-4">
                <Trophy className="w-16 h-16 text-yellow-600" />
                <div className="flex flex-col items-center">
                  {playerProfiles[currentChampion.name] ? (
                    <MediaDisplay
                      src={playerProfiles[currentChampion.name]}
                      alt={currentChampion.name}
                      className="w-20 h-20 rounded-full object-cover border-4 border-yellow-500 mb-2"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-yellow-200 flex items-center justify-center border-4 border-yellow-500 mb-2">
                      <span className="text-yellow-800 font-bold text-2xl">
                        {currentChampion.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <h2 className="text-3xl font-serif font-bold text-amber-800">Current Champion</h2>
                  <p className="text-2xl font-serif text-amber-700 mt-2">{currentChampion.name}</p>
                  <div className="flex items-center justify-center gap-4 mt-2 text-amber-600">
                    <Badge variant="secondary" className="bg-yellow-200 text-amber-800">
                      {currentChampion.totalPoints} Total Points
                    </Badge>
                    <Badge variant="secondary" className="bg-yellow-200 text-amber-800">
                      {currentChampion.wins} Victories
                    </Badge>
                  </div>
                </div>
                <Trophy className="w-16 h-16 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Leaderboard */}
          <Card className="bg-gradient-to-b from-amber-50 to-orange-50 border-2 border-amber-300 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-amber-200 to-orange-200 border-b-2 border-amber-300">
              <CardTitle className="text-2xl font-serif text-amber-800 flex items-center gap-2">
                <Shield className="w-6 h-6" />
                Hall of Fame
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {players.length === 0 ? (
                <p className="text-center text-amber-700 font-serif py-8">
                  No champions yet. Start your first conquest!
                </p>
              ) : (
                <div className="space-y-4">
                  {players.map((player, index) => (
                    <div
                      key={player.name}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                        index === 0
                          ? "bg-gradient-to-r from-yellow-100 to-amber-100 border-yellow-400"
                          : index === 1
                            ? "bg-gradient-to-r from-gray-100 to-slate-100 border-gray-400"
                            : index === 2
                              ? "bg-gradient-to-r from-orange-100 to-amber-100 border-orange-400"
                              : "bg-white border-amber-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-800 text-white font-bold">
                          {index + 1}
                        </div>
                        {playerProfiles[player.name] ? (
                          <MediaDisplay
                            src={playerProfiles[player.name]}
                            alt={player.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-amber-400"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center border-2 border-amber-400">
                            <span className="text-amber-800 font-bold text-lg">
                              {player.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="font-serif font-bold text-amber-800">{player.name}</h3>
                          <p className="text-sm text-amber-600">
                            {player.gamesPlayed} games • {player.averagePoints.toFixed(1)} avg
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-800">{player.totalPoints} pts</p>
                        <p className="text-sm text-amber-600">{player.wins} wins</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Game Form */}
          <Card className="bg-gradient-to-b from-amber-50 to-orange-50 border-2 border-amber-300 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-amber-200 to-orange-200 border-b-2 border-amber-300">
              <CardTitle className="text-2xl font-serif text-amber-800 flex items-center gap-2">
                <Sword className="w-6 h-6" />
                Record New Battle
                {!isAuthenticated && <Lock className="w-4 h-4 text-red-600" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {!showAddGame ? (
                <Button
                  onClick={() => {
                    if (!isAuthenticated) {
                      setShowAuth(true)
                    } else {
                      setShowAddGame(true)
                    }
                  }}
                  className="w-full bg-amber-700 hover:bg-amber-800 text-white font-serif text-lg py-3"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add New Game Result
                  {!isAuthenticated && <Lock className="w-4 h-4 ml-2" />}
                </Button>
              ) : (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((num) => (
                    <div key={num} className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-serif text-amber-800">Player {num} Name</Label>
                        <Input
                          value={newGame[`player${num}` as keyof typeof newGame].name}
                          onChange={(e) =>
                            setNewGame({
                              ...newGame,
                              [`player${num}`]: {
                                ...newGame[`player${num}` as keyof typeof newGame],
                                name: e.target.value,
                              },
                            })
                          }
                          className="border-amber-300 focus:border-amber-500"
                          placeholder={num <= 2 ? "Required" : "Optional"}
                        />
                      </div>
                      <div>
                        <Label className="font-serif text-amber-800">Points</Label>
                        <Input
                          type="number"
                          value={newGame[`player${num}` as keyof typeof newGame].points}
                          onChange={(e) =>
                            setNewGame({
                              ...newGame,
                              [`player${num}`]: {
                                ...newGame[`player${num}` as keyof typeof newGame],
                                points: Number.parseInt(e.target.value) || 0,
                              },
                            })
                          }
                          className="border-amber-300 focus:border-amber-500"
                          min="0"
                          max="10"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleAddGame}
                      className="flex-1 bg-green-700 hover:bg-green-800 text-white font-serif"
                    >
                      Record Victory
                    </Button>
                    <Button
                      onClick={() => setShowAddGame(false)}
                      variant="outline"
                      className="flex-1 border-amber-300 text-amber-800 font-serif"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              <Button
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowAuth(true)
                  } else {
                    setShowPlayerManager(true)
                  }
                }}
                variant="outline"
                className="w-full mt-2 border-amber-300 text-amber-800 hover:bg-amber-50 font-serif"
              >
                <Crown className="w-4 h-4 mr-2" />
                Manage Player Profiles
                {!isAuthenticated && <Lock className="w-4 h-4 ml-2" />}
              </Button>
              
              {/* Danger Zone - Delete Board */}
              {isAuthenticated && (
                <div className="mt-6 pt-4 border-t border-red-200">
                  <p className="text-sm font-serif text-red-600 mb-2 text-center">Danger Zone</p>
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="outline"
                    className="w-full border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 font-serif"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Board
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Authentication Modal */}
        {showAuth && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-gradient-to-b from-amber-50 to-orange-50 border-2 border-amber-300">
              <CardHeader className="bg-gradient-to-r from-amber-200 to-orange-200 border-b-2 border-amber-300">
                <CardTitle className="text-xl font-serif text-amber-800 flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Board Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label className="font-serif text-amber-800">Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-amber-300 focus:border-amber-500"
                      placeholder="Enter board password"
                      onKeyPress={(e) => e.key === "Enter" && handleAuth()}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAuth}
                      className="flex-1 bg-amber-700 hover:bg-amber-800 text-white font-serif"
                    >
                      Authenticate
                    </Button>
                    <Button
                      onClick={() => setShowAuth(false)}
                      variant="outline"
                      className="flex-1 border-amber-300 text-amber-800 font-serif"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Player Manager Modal */}
        {showPlayerManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-gradient-to-b from-amber-50 to-orange-50 border-2 border-amber-300">
              <CardHeader className="bg-gradient-to-r from-amber-200 to-orange-200 border-b-2 border-amber-300">
                <CardTitle className="text-xl font-serif text-amber-800 flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  Manage Player Profiles
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label className="font-serif text-amber-800">Select Player</Label>
                    <select
                      value={selectedPlayer}
                      onChange={(e) => setSelectedPlayer(e.target.value)}
                      className="w-full p-2 border border-amber-300 rounded-md bg-white"
                    >
                      <option value="">Choose a player...</option>
                      {players.map((player) => (
                        <option key={player.name} value={player.name}>
                          {player.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedPlayer && (
                    <div className="space-y-4">
                      <div className="text-center">
                        {playerProfiles[selectedPlayer] ? (
                          <MediaDisplay
                            src={playerProfiles[selectedPlayer]}
                            alt={selectedPlayer}
                            className="w-24 h-24 rounded-full object-cover border-4 border-amber-400 mx-auto"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-amber-200 flex items-center justify-center border-4 border-amber-400 mx-auto">
                            <span className="text-amber-800 font-bold text-2xl">
                              {selectedPlayer.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <p className="font-serif text-amber-800 mt-2">{selectedPlayer}</p>
                      </div>

                      <div>
                        <Label className="font-serif text-amber-800">Upload New Profile Picture or Video</Label>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleImageUpload(selectedPlayer, file)
                            }
                          }}
                          className="w-full p-2 border border-amber-300 rounded-md bg-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => {
                        setShowPlayerManager(false)
                        setSelectedPlayer("")
                      }}
                      className="flex-1 bg-amber-700 hover:bg-amber-800 text-white font-serif"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-gradient-to-b from-red-50 to-red-100 border-2 border-red-300">
              <CardHeader className="bg-gradient-to-r from-red-200 to-red-300 border-b-2 border-red-400">
                <CardTitle className="text-xl font-serif text-red-800 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Delete Board
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="font-serif text-red-800 mb-2">
                      Are you sure you want to delete this board?
                    </p>
                    <p className="text-sm text-red-600">
                      This will permanently delete:
                    </p>
                    <ul className="text-sm text-red-600 mt-2 space-y-1">
                      <li>• All player data and statistics</li>
                      <li>• All game records and history</li>
                      <li>• All player profile images</li>
                      <li>• The board "{boardInfo?.name}" itself</li>
                    </ul>
                    <p className="text-sm font-bold text-red-700 mt-3">
                      This action cannot be undone!
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleDeleteBoard}
                      disabled={deleting}
                      className="flex-1 bg-red-700 hover:bg-red-800 text-white font-serif"
                    >
                      {deleting ? "Deleting..." : "Yes, Delete Board"}
                    </Button>
                    <Button
                      onClick={() => setShowDeleteConfirm(false)}
                      variant="outline"
                      disabled={deleting}
                      className="flex-1 border-gray-300 text-gray-800 font-serif"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Games */}
        {games.length > 0 && (
          <Card className="mt-8 bg-gradient-to-b from-amber-50 to-orange-50 border-2 border-amber-300 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-amber-200 to-orange-200 border-b-2 border-amber-300">
              <CardTitle className="text-2xl font-serif text-amber-800 flex items-center gap-2">
                <Scroll className="w-6 h-6" />
                Recent Conquests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {games.slice(0, 5).map((game) => (
                  <div key={game.id} className="p-4 bg-white rounded-lg border-2 border-amber-200">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm text-amber-600 font-serif">{new Date(game.date).toLocaleDateString()}</p>
                      <Badge className="bg-green-100 text-green-800">Winner: {game.winner}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {game.players.map((player) => (
                        <div key={player.name} className="text-center p-2 bg-amber-50 rounded border">
                          <p className="font-serif font-bold text-amber-800">{player.name}</p>
                          <p className="text-amber-600">{player.points} pts</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 