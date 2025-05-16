"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  className?: string
  showAddNew?: boolean
  onAddNew?: (value: string) => void
  width?: string
  disabled?: boolean
}

export function Combobox({
  options = [],
  value = "",
  onChange,
  placeholder = "Select an option",
  emptyText = "No results found",
  className,
  showAddNew = false,
  onAddNew,
  width = "w-[300px]",
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  
  // Ensure options is always an array
  const safeOptions = Array.isArray(options) ? options : []
  
  const filteredOptions = safeOptions.filter((option) => {
    if (!inputValue) return true
    if (!option || !option.label) return false
    return option.label.toString().toLowerCase().includes(inputValue.toLowerCase())
  })
  
  const selectedOption = safeOptions.find((option) => option && option.value === value)

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
        <Command>
          <CommandInput 
            placeholder={placeholder} 
            value={inputValue}
            onValueChange={setInputValue}
            className="h-10 rounded-t-xl rounded-b-none border-b border-neutral-100"
          />
          <CommandEmpty className="py-3 text-sm text-center text-neutral-500">
            {emptyText}
            {showAddNew && inputValue && inputValue.trim && inputValue.trim() && (
              <div 
                className="flex items-center justify-center mt-2 p-2 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors"
                onClick={() => {
                  if (onAddNew) {
                    onAddNew(inputValue.trim());
                  }
                  setOpen(false);
                }}
              >
                <Plus className="mr-2 h-4 w-4 text-primary" />
                <span className="text-primary font-medium">Add "{inputValue.trim()}"</span>
              </div>
            )}
          </CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-y-auto p-1">
            {filteredOptions.map((option) => {
              if (!option) return null;
              return (
                <CommandItem
                  key={option.value || "option-" + Math.random()}
                  value={option.value || ""}
                  onSelect={() => {
                    onChange(option.value || "")
                    setInputValue("")
                    setOpen(false)
                  }}
                  className="rounded-lg py-2 px-3 text-sm hover:bg-neutral-50 cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100 text-primary" : "opacity-0"
                    )}
                  />
                  <span>{option.label || ""}</span>
                </CommandItem>
              );
            })}
            {showAddNew && inputValue && inputValue.trim && inputValue.trim() && (
              <CommandItem
                value="add-new"
                onSelect={() => {
                  if (onAddNew) {
                    onAddNew(inputValue.trim());
                  }
                  setInputValue("")
                  setOpen(false)
                }}
                className="rounded-lg py-2 px-3 text-sm flex items-center justify-center text-primary cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span>Add "{inputValue.trim()}"</span>
              </CommandItem>
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}