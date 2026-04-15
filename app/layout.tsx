import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { LayoutWrapper } from "@/components/layout/layout-wrapper"
import { QueryClientProvider } from "@/components/providers/query-client-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

export const metadata: Metadata = {
  title: "Academic Management System",
  description: "Modern academic management system",
  generator: "v0.app",
  icons: {
    icon: "/amoud-logo.png",
    apple: "/amoud-logo.png",
  },
}

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode
  modal: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={false}
        >
          <QueryClientProvider>
            <LayoutWrapper>
              <Suspense fallback={null}>{children}</Suspense>
            </LayoutWrapper>
            {modal}
            <Toaster />
          </QueryClientProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
