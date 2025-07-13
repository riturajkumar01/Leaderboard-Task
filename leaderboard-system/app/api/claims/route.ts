import { type NextRequest, NextResponse } from "next/server"
import { sql, type User } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId || typeof userId !== "number") {
      return NextResponse.json({ success: false, message: "Valid user ID is required" }, { status: 400 })
    }

    // Check if user exists
    const users = (await sql`
      SELECT id, name FROM users WHERE id = ${userId}
    `) as User[]

    if (users.length === 0) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    const user = users[0]

    // Generate random points (1-10)
    const points = Math.floor(Math.random() * 10) + 1

    // Start transaction
    await sql`BEGIN`

    try {
      // Update user's total points
      await sql`
        UPDATE users 
        SET total_points = total_points + ${points} 
        WHERE id = ${userId}
      `

      // Insert claim history record
      await sql`
        INSERT INTO claim_history (user_id, user_name, points) 
        VALUES (${userId}, ${user.name}, ${points})
      `

      await sql`COMMIT`

      return NextResponse.json({
        success: true,
        points: points,
        message: `${user.name} claimed ${points} points!`,
      })
    } catch (error) {
      await sql`ROLLBACK`
      throw error
    }
  } catch (error) {
    console.error("Error claiming points:", error)
    return NextResponse.json({ success: false, message: "Failed to claim points" }, { status: 500 })
  }
}
