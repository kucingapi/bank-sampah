import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { Sun, Moon } from "lucide-react"

import { cn } from "@/shared/lib/utils"

interface ThemeSwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}

export function ThemeSwitch({ checked, onCheckedChange, className }: ThemeSwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-input transition-all outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-foreground",
        className
      )}
      checked={checked}
      onCheckedChange={onCheckedChange}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none flex size-4 items-center justify-center rounded-full bg-background ring-0 transition-transform duration-200 data-[state=checked]:translate-x-[calc(100%-1px)] data-[state=unchecked]:translate-x-0"
        )}
      >
        {checked ? (
          <Moon className="size-3 text-foreground" />
        ) : (
          <Sun className="size-3 text-foreground" />
        )}
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  )
}
