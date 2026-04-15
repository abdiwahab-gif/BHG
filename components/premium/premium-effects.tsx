"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import gsap from "gsap"

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(Boolean(mq.matches))
    update()
    mq.addEventListener?.("change", update)
    return () => mq.removeEventListener?.("change", update)
  }, [])

  return reduced
}

export function PremiumEffects() {
  const reducedMotion = usePrefersReducedMotion()
  const glowRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (reducedMotion) return
    const el = glowRef.current
    if (!el) return

    gsap.set(el, { opacity: 0, x: -9999, y: -9999 })

    const xTo = gsap.quickTo(el, "x", { duration: 0.25, ease: "power3" })
    const yTo = gsap.quickTo(el, "y", { duration: 0.25, ease: "power3" })
    const oTo = gsap.quickTo(el, "opacity", { duration: 0.2, ease: "power2.out" })

    const onMove = (e: MouseEvent) => {
      const size = 520
      xTo(e.clientX - size / 2)
      yTo(e.clientY - size / 2)
      oTo(1)
    }

    const onLeave = () => {
      oTo(0)
    }

    window.addEventListener("mousemove", onMove, { passive: true })
    window.addEventListener("mouseleave", onLeave)

    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseleave", onLeave)
    }
  }, [reducedMotion])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Animated gradient base */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-secondary/15"
        style={{ backgroundSize: "200% 200%" }}
        animate={
          reducedMotion
            ? undefined
            : {
                backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
              }
        }
        transition={reducedMotion ? undefined : { duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating orbs */}
      <motion.div
        className="absolute -top-24 -left-24 h-[520px] w-[520px] rounded-full bg-primary/20 blur-3xl"
        animate={reducedMotion ? undefined : { x: [0, 80, 0], y: [0, 40, 0], scale: [1, 1.06, 1] }}
        transition={reducedMotion ? undefined : { duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -right-40 h-[620px] w-[620px] rounded-full bg-secondary/18 blur-3xl"
        animate={reducedMotion ? undefined : { x: [0, -90, 0], y: [0, -55, 0], scale: [1, 1.08, 1] }}
        transition={reducedMotion ? undefined : { duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
        animate={reducedMotion ? undefined : { y: [0, -40, 0], scale: [1, 1.05, 1] }}
        transition={reducedMotion ? undefined : { duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Cursor glow */}
      <div
        ref={glowRef}
        className="absolute h-[520px] w-[520px] rounded-full bg-primary/18 blur-3xl opacity-0"
        style={{ willChange: "transform, opacity" }}
      />

      {/* Soft vignette to keep contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/20" />
    </div>
  )
}
