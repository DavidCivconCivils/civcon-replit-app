"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

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
  options = [],
  value = "",
  onChange,
  placeholder = "Select an option",
  className,
  width = "w-[300px]",
  disabled = false,
}: BasicDropdownProps) {
  // Ensure options is always an array
  const safeOptions = Array.isArray(options) ? options : []
  
  const selectedOption = safeOptions.find((option) => option && option.value === value)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value)
  }

  return (
    <select
      value={value || ""}
      onChange={handleChange}
      disabled={disabled}
      className={cn(
        "h-10 w-full rounded-xl px-3 py-2 text-base",
        "border border-neutral-200 bg-background",
        "transition-all duration-200 ease-out",
        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:ring-offset-1",
        width,
        className
      )}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {safeOptions.map((option) => {
        if (!option) return null;
        return (
          <option key={option.value || `option-${Math.random()}`} value={option.value || ""}>
            {option.label || ""}
          </option>
        );
      })}
    </select>
  )
}