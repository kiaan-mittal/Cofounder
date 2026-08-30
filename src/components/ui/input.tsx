import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-none border-0 bg-transparent px-3.5 text-[16px] text-ink caret-ink shadow-none outline-none placeholder:text-pencil/80 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:ring-0",
        "aria-invalid:text-oxblood",
        className
      )}
      {...props}
    />
  )
}

export { Input }
