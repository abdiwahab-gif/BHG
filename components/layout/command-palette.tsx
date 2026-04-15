"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  DollarSign,
  HandCoins,
  Wallet,
  Bell,
  UserCog,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Search,
} from "lucide-react"
import { useTheme } from "next-themes"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { clearAuthSession } from "@/lib/session-client"

type CommandAction = {
  id: string
  label: string
  keywords?: string
  icon: React.ReactNode
  onSelect: () => void
  shortcut?: string
  active?: boolean
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  if (tag === "input" || tag === "textarea" || tag === "select") return true
  return Boolean(target.isContentEditable)
}

export function CommandPalette() {
  const router = useRouter()
  const pathname = usePathname()
  const { setTheme, theme, resolvedTheme } = useTheme()

  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableElement(e.target)) return

      const isModK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k"
      const isSlash = e.key === "/"

      if (isModK || isSlash) {
        e.preventDefault()
        setOpen((v) => !v)
      }

      if (e.key === "Escape") {
        setOpen(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener("bhg:command-palette:open", onOpen as EventListener)
    return () => window.removeEventListener("bhg:command-palette:open", onOpen as EventListener)
  }, [])

  const actions = useMemo(() => {
    const nav: CommandAction[] = [
      {
        id: "nav-dashboard",
        label: "Go to Dashboard",
        keywords: "home fundraising overview",
        icon: <LayoutDashboard className="h-4 w-4" />,
        onSelect: () => router.push("/fundraising"),
        shortcut: "G D",
        active: pathname === "/fundraising" || pathname.startsWith("/fundraising/"),
      },
      {
        id: "nav-members",
        label: "Go to Members",
        keywords: "people community registration",
        icon: <Users className="h-4 w-4" />,
        onSelect: () => router.push("/members"),
        shortcut: "G M",
        active: pathname === "/members" || pathname.startsWith("/members/"),
      },
      {
        id: "nav-donations",
        label: "Go to Donations",
        keywords: "payments contributions",
        icon: <DollarSign className="h-4 w-4" />,
        onSelect: () => router.push("/donations"),
        shortcut: "G O",
        active: pathname === "/donations" || pathname.startsWith("/donations/"),
      },
      {
        id: "nav-income",
        label: "Go to Income",
        keywords: "incomes revenue",
        icon: <HandCoins className="h-4 w-4" />,
        onSelect: () => router.push("/fundraising/incomes"),
        shortcut: "G I",
        active: pathname === "/fundraising/incomes" || pathname.startsWith("/fundraising/incomes/"),
      },
      {
        id: "nav-expenses",
        label: "Go to Expenses",
        keywords: "costs spend",
        icon: <Wallet className="h-4 w-4" />,
        onSelect: () => router.push("/fundraising/expenses"),
        shortcut: "G E",
        active: pathname === "/fundraising/expenses" || pathname.startsWith("/fundraising/expenses/"),
      },
      {
        id: "nav-notice",
        label: "Go to Notices",
        keywords: "announcements",
        icon: <Bell className="h-4 w-4" />,
        onSelect: () => router.push("/notice"),
        shortcut: "G N",
        active: pathname === "/notice" || pathname.startsWith("/notice/"),
      },
      {
        id: "nav-users",
        label: "Go to User Management",
        keywords: "accounts roles admin",
        icon: <UserCog className="h-4 w-4" />,
        onSelect: () => router.push("/users"),
        shortcut: "G U",
        active: pathname === "/users" || pathname.startsWith("/users/"),
      },
    ]

    const themeActions: CommandAction[] = [
      {
        id: "theme-light",
        label: "Theme: Light",
        keywords: "appearance bright",
        icon: <Sun className="h-4 w-4" />,
        onSelect: () => setTheme("light"),
        shortcut: "T L",
        active: resolvedTheme === "light",
      },
      {
        id: "theme-dark",
        label: "Theme: Dark",
        keywords: "appearance night",
        icon: <Moon className="h-4 w-4" />,
        onSelect: () => setTheme("dark"),
        shortcut: "T D",
        active: resolvedTheme === "dark",
      },
      {
        id: "theme-system",
        label: "Theme: System",
        keywords: "appearance os",
        icon: <Monitor className="h-4 w-4" />,
        onSelect: () => setTheme("system"),
        shortcut: "T S",
        active: theme === "system",
      },
    ]

    const account: CommandAction[] = [
      {
        id: "logout",
        label: "Log out",
        keywords: "sign out exit",
        icon: <LogOut className="h-4 w-4" />,
        onSelect: () => {
          clearAuthSession()
          router.push("/login")
          router.refresh()
        },
        shortcut: "⌥ L",
      },
    ]

    return { nav, themeActions, account }
  }, [pathname, resolvedTheme, router, setTheme, theme])

  const run = (action: CommandAction) => {
    setOpen(false)
    queueMicrotask(() => action.onSelect())
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} className="max-w-xl">
      <CommandInput placeholder="Search… (Ctrl+K)" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {actions.nav.map((a) => (
            <CommandItem
              key={a.id}
              value={`${a.label} ${a.keywords || ""}`}
              onSelect={() => run(a)}
              className={a.active ? "bg-accent/50" : undefined}
            >
              {a.icon}
              <span>{a.label}</span>
              {a.shortcut && <CommandShortcut>{a.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Theme">
          {actions.themeActions.map((a) => (
            <CommandItem
              key={a.id}
              value={`${a.label} ${a.keywords || ""}`}
              onSelect={() => run(a)}
              className={a.active ? "bg-accent/50" : undefined}
            >
              {a.icon}
              <span>{a.label}</span>
              {a.shortcut && <CommandShortcut>{a.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Account">
          {actions.account.map((a) => (
            <CommandItem key={a.id} value={`${a.label} ${a.keywords || ""}`} onSelect={() => run(a)}>
              {a.icon}
              <span>{a.label}</span>
              {a.shortcut && <CommandShortcut>{a.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

export function CommandPaletteButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("bhg:command-palette:open"))}
      className="group hidden sm:flex items-center gap-2 rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      aria-label="Open command palette"
    >
      <Search className="h-4 w-4" />
      <span>Search</span>
      <span className="ml-2 rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground group-hover:bg-muted">
        Ctrl K
      </span>
    </button>
  )
}
