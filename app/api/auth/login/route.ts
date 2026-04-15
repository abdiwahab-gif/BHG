import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { type RowDataPacket } from "mysql2/promise"
import { dbQuery } from "@/lib/db"

interface DbUser extends RowDataPacket {
  id: string
  email: string
  password: string
  name: string
  role: string
  isActive?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      )
    }

    const users = await dbQuery<DbUser>(
      "SELECT id, email, password, name, role, isActive FROM users WHERE email = ? LIMIT 1",
      [email]
    )

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      )
    }

    const user = users[0]
    if (user.isActive === false) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      )
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "your-secret-key-change-in-production",
      { expiresIn: "7d" }
    )

    // Return success with token and user info
    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Login error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Error details:", errorMessage)
    return NextResponse.json(
      { success: false, message: "Internal server error", error: errorMessage },
      { status: 500 }
    )
  }
}
