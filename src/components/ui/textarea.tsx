import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full resize-none rounded-none border-0 bg-transparent px-3.5 py-3 text-[16px] leading-relaxed text-ink caret-ink shadow-none outline-none placeholder:text-pencil/80 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:text-oxblood",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
