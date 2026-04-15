"use client"

import type { ReactElement } from "react"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserCheck,
  FileText,
  Bell,
  Calendar,
  BookOpen,
  Clock,
  Settings,
  TrendingUp,
  CreditCard,
  UserCog,
  Library,
  ChevronLeft,
  Search,
  ChevronRight,
  Eye,
  UserPlus,
  ShoppingCart,
  Building2,
  CalendarDays,
  DollarSign,
  HandCoins,
  Award,
  Upload,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"

interface SidebarProps {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  isMobile?: boolean
  onMobileClose?: () => void
}

interface SubMenuItem {
  id: string
  label: string
  icon: ReactElement
  href: string
}

interface MenuItem {
  id: string
  label: string
  icon: ReactElement
  href: string
  badge?: number
  active?: boolean
  subItems?: SubMenuItem[]
}

type MenuSection = {
  id: string
  label: string
  items: MenuItem[]
}

const SIDEBAR_SCROLL_KEY = "amoud:sidebar:scrollTop"

const menuItems: MenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0" />,
    href: "/dashboard",
    active: false,
  },
  {
    id: "classes",
    label: "Classes",
    icon: <Users className="h-5 w-5 flex-shrink-0" />,
    href: "/classes",
    active: false,
    subItems: [
      {
        id: "view-classes",
        label: "View Classes",
        icon: <Eye className="h-4 w-4" />,
        href: "/classes",
      },
      {
        id: "add-class",
        label: "Add Class",
        icon: <UserPlus className="h-4 w-4" />,
        href: "/classes/add",
      },
    ],
  },
  {
    id: "students",
    label: "Students",
    icon: <GraduationCap className="h-5 w-5 flex-shrink-0" />,
    href: "/students",
    active: false,
    subItems: [
      {
        id: "view-students",
        label: "View Students",
        icon: <Eye className="h-4 w-4" />,
        href: "/students",
      },
      {
        id: "add-student",
        label: "Add Student",
        icon: <UserPlus className="h-4 w-4" />,
        href: "/students/add",
      },
    ],
    href: "/procurement",
  },
  {
    id: "users",
    label: "User Management",
    icon: <UserCog className="h-5 w-5 flex-shrink-0" />,
    href: "/users",
    active: false,
    subItems: [
      {
        id: "view-users",
        label: "View Users",
        icon: <Eye className="h-4 w-4" />,
        href: "/users",
      },
      {
        id: "add-user",
        label: "Add User",
        icon: <UserPlus className="h-4 w-4" />,
        href: "/users/add",
      },
    ],
  },
  {
    id: "fundraising",
    label: "Fundraising",
    icon: <HandCoins className="h-5 w-5 flex-shrink-0" />,
    href: "/fundraising",
    active: false,
    subItems: [
      {
        id: "fundraising-dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
        href: "/fundraising",
      },
      {
        id: "fundraising-members",
        label: "Members",
        icon: <Users className="h-4 w-4" />,
        href: "/members",
      },
      {
        id: "fundraising-donations",
        label: "Donations",
        icon: <DollarSign className="h-4 w-4" />,
        href: "/donations",
      },
      {
        id: "fundraising-incomes",
        label: "Income",
        icon: <HandCoins className="h-4 w-4" />,
        href: "/fundraising/incomes",
      },
      {
        id: "fundraising-expenses",
        label: "Expenses",
        icon: <Wallet className="h-4 w-4" />,
        href: "/fundraising/expenses",
      },
    ],
  },
  {
    id: "notice",
    label: "Notice",
    icon: <Bell className="h-5 w-5 flex-shrink-0" />,
    href: "/notice",
    active: false,
  },
  {
    id: "users",
    label: "User Management",
    icon: <UserCog className="h-5 w-5 flex-shrink-0" />,
    href: "/users",
    active: false,
    subItems: [
      {
        id: "view-users",
        label: "View Users",
        icon: <Eye className="h-4 w-4" />,
        href: "/users",
      },
      {
        id: "add-user",
        label: "Add User",
        icon: <UserPlus className="h-4 w-4" />,
        href: "/users/add",
      },
    ],
  },
]

export function Sidebar({ collapsed, onCollapsedChange, isMobile = false, onMobileClose }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const pathname = usePathname()
  const navRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    try {
      const saved = window.sessionStorage.getItem(SIDEBAR_SCROLL_KEY)
      if (saved) nav.scrollTop = Number(saved) || 0
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return

    const t = window.setTimeout(() => {
      const activeEl = nav.querySelector('[data-sidebar-active="true"]') as HTMLElement | null
      activeEl?.scrollIntoView({ block: "nearest" })
    }, 0)

    return () => window.clearTimeout(t)
  }, [pathname, collapsed, isMobile])

  const filteredMenuItems = menuItems.filter((item) => item.label.toLowerCase().includes(searchQuery.toLowerCase()))

  const sections: MenuSection[] = (() => {
    if (searchQuery.trim()) {
      return [{ id: "search", label: "Results", items: filteredMenuItems }]
    }
    return [{ id: "main", label: "Menu", items: menuItems }]
  })()

  const handleMenuItemClick = () => {
    if (isMobile && onMobileClose) {
      onMobileClose()
    }
  }

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  const isItemActive = (item: MenuItem) => {
    const isRouteActive = (href: string) => {
      if (href === "/") return pathname === "/"
      return pathname === href || pathname.startsWith(`${href}/`)
    }

    if (isRouteActive(item.href)) return true
    if (item.subItems) return item.subItems.some((subItem) => isRouteActive(subItem.href))
    return false
  }

  const MenuItem = ({ item, index }: { item: MenuItem; index: number }) => {
    const hasSubItems = item.subItems && item.subItems.length > 0
    const isExpanded = expandedItems.includes(item.id)
    const isActive = isItemActive(item)

    useEffect(() => {
      if (!hasSubItems) return
      const shouldExpand = Boolean(item.subItems?.some((subItem) => pathname === subItem.href))
      if (!shouldExpand) return
      setExpandedItems((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]))
    }, [pathname, item.id, hasSubItems, item.subItems])

    const menuButton = (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {hasSubItems ? (
          <Button
            variant={isActive ? "default" : "ghost"}
            data-sidebar-active={isActive ? "true" : "false"}
            className={cn(
              "w-full justify-start gap-3 h-11 px-3 transition-all duration-200",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-foreground",
              collapsed && !isMobile && "justify-center px-2",
            )}
            onClick={() => toggleExpanded(item.id)}
          >
            {item.icon}
            <AnimatePresence>
              {(!collapsed || isMobile) && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between flex-1"
                >
                  <span className="text-left">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="bg-sidebar-primary text-sidebar-primary-foreground text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center"
                      >
                        {item.badge}
                      </motion.span>
                    )}
                    <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronRight className="h-4 w-4" />
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {collapsed && !isMobile && item.badge && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 bg-sidebar-primary text-sidebar-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center"
              >
                {item.badge}
              </motion.span>
            )}
          </Button>
        ) : (
          <Button
            asChild
            variant={isActive ? "default" : "ghost"}
            data-sidebar-active={isActive ? "true" : "false"}
            className={cn(
              "w-full justify-start gap-3 h-11 px-3 transition-all duration-200",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-foreground",
              collapsed && !isMobile && "justify-center px-2",
            )}
          >
            <Link href={item.href} onClick={handleMenuItemClick}>
              {item.icon}
              <AnimatePresence>
                {(!collapsed || isMobile) && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between flex-1"
                  >
                    <span className="text-left">{item.label}</span>
                    {item.badge && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="bg-sidebar-primary text-sidebar-primary-foreground text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center"
                      >
                        {item.badge}
                      </motion.span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              {collapsed && !isMobile && item.badge && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-sidebar-primary text-sidebar-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center"
                >
                  {item.badge}
                </motion.span>
              )}
            </Link>
          </Button>
        )}
      </motion.div>
    )

    if (collapsed && !isMobile) {
      return (
        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">{menuButton}</div>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-2">
                {item.label}
                {item.badge && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {hasSubItems && isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="ml-4 mt-1 space-y-1"
            >
              {item.subItems?.map((subItem) => {
                const isSubActive = pathname === subItem.href
                return (
                  <TooltipProvider key={subItem.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          asChild
                          variant={isSubActive ? "default" : "ghost"}
                          size="sm"
                          data-sidebar-active={isSubActive ? "true" : "false"}
                          className={cn(
                            "w-full justify-center h-8 px-2",
                            isSubActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-accent/80",
                          )}
                        >
                          <Link href={subItem.href} onClick={handleMenuItemClick}>
                            {subItem.icon}
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">{subItem.label}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
            </motion.div>
          )}
        </div>
      )
    }

    return (
      <div>
        {menuButton}
        <AnimatePresence>
          {hasSubItems && isExpanded && (!collapsed || isMobile) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="ml-4 mt-1 space-y-1"
            >
              {item.subItems?.map((subItem) => {
                const isSubActive = pathname === subItem.href
                return (
                  <motion.div
                    key={subItem.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      asChild
                      variant={isSubActive ? "default" : "ghost"}
                      size="sm"
                      data-sidebar-active={isSubActive ? "true" : "false"}
                      className={cn(
                        "w-full justify-start gap-2 h-9 px-3 text-sm",
                        isSubActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/80",
                      )}
                    >
                      <Link href={subItem.href} onClick={handleMenuItemClick}>
                        {subItem.icon}
                        {subItem.label}
                      </Link>
                    </Button>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex h-full flex-col bg-sidebar border-r border-sidebar-border"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <motion.div
          className="flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <motion.div
            className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.3 }}
          >
            <Image
              src="/amoud-logo.png"
              alt="Amoud University Logo"
              width={32}
              height={32}
              className="w-full h-full object-contain"
            />
          </motion.div>
          <AnimatePresence>
            {(!collapsed || isMobile) && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="font-semibold text-sidebar-foreground whitespace-nowrap"
              >
                Amoud University
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {!isMobile && (
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCollapsedChange(!collapsed)}
              className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.3 }}>
                <ChevronLeft className="h-4 w-4" />
              </motion.div>
            </Button>
          </motion.div>
        )}
      </div>

      {/* Search */}
      <AnimatePresence>
        {(!collapsed || isMobile) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 border-b border-sidebar-border"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sidebar-foreground/50 h-4 w-4" />
              <Input
                placeholder="Search menus..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50 transition-all duration-200 focus:ring-2 focus:ring-sidebar-ring"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Menu */}
      <nav
        ref={navRef}
        className="flex-1 overflow-y-auto p-4"
        onScroll={() => {
          const nav = navRef.current
          if (!nav) return
          try {
            window.sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(nav.scrollTop))
          } catch {
            // ignore
          }
        }}
      >
        <motion.div className="space-y-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <AnimatePresence>
            {sections.flatMap((section, sectionIndex) => {
              const header = (!collapsed || isMobile) && section.label
              const showBetweenSectionSeparator = sectionIndex > 0

              const sectionSeparator = header ? (
                <motion.div
                  key={`${section.id}-header`}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn("pb-2", showBetweenSectionSeparator ? "pt-4" : "pt-1")}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-sidebar-border" />
                    <div className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60 whitespace-nowrap">
                      {section.label}
                    </div>
                    <div className="h-px flex-1 bg-sidebar-border" />
                  </div>
                </motion.div>
              ) : showBetweenSectionSeparator ? (
                <motion.div
                  key={`${section.id}-divider`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="my-3 h-px bg-sidebar-border"
                />
              ) : null

              return [
                sectionSeparator,
                ...section.items.map((item, index) => <MenuItem key={item.id} item={item} index={index} />),
              ]
            })}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {(!collapsed || isMobile) && searchQuery && filteredMenuItems.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-8 text-sidebar-foreground/50"
            >
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No menus found</p>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Footer */}
      <motion.div
        className="p-4 border-t border-sidebar-border"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="text-xs text-sidebar-foreground/50 text-center">
          {!collapsed || isMobile ? "Amoud University MS" : "AU MS"}
        </div>
      </motion.div>
    </motion.div>
  )
}
