"use client"

import type { HTMLAttributes } from "react"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function ScrollReveal({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={cn(className)}
      {...props}
    />
  )
}
