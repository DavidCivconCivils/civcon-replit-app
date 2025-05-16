"use client"

import * as React from "react"
import { ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DropdownOption {
  value: string
  label: string
}

interface BasicDropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  width?: string
  disabled?: boolean
}

export function BasicDropdown({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className,
  width = "w-[300px]",
  disabled = false,
}: BasicDropdownProps) {
  const [open, setOpen] = React.useState(false)
  
  const selectedOption = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between h-10 rounded-xl px-4 py-2 text-base",
            "border border-neutral-200 bg-background",
            "transition-all duration-200 ease-out",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:ring-offset-1",
            width,
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">{selectedOption?.label || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "p-0 rounded-xl border border-neutral-100",
          "shadow-[0_8px_30px_rgba(0,0,0,0.08),_0_0_10px_rgba(0,0,0,0.05)]",
          width
        )}
      >
        <div className="max-h-[200px] overflow-y-auto py-1">
          {options.map((option) => (
            <div
              key={option.value}
              className={cn(
                "relative flex cursor-pointer select-none items-center rounded-lg py-2 px-3 text-sm outline-none",
                "transition-colors duration-150 ease-out",
                "hover:bg-neutral-50",
                value === option.value ? "bg-primary/5 font-medium" : ""
              )}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}