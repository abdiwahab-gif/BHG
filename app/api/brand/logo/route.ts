import { readFile } from "node:fs/promises"
import path from "node:path"

export const runtime = "nodejs"

export async function GET() {
  const logoPath = path.join(process.cwd(), "BHG.gif")

  try {
    const bytes = await readFile(logoPath)
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}
