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
  options,
  value,
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
  const [searchTerm, setSearchTerm] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  
  const filteredOptions = options?.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []
  
  const selectedOption = options?.find((option) => option.value === value)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchTerm("");
    }
  }

  const handleSelect = (currentValue: string) => {
    if (currentValue === "add-new" && onAddNew) {
      onAddNew(searchTerm);
    } else {
      onChange(currentValue);
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between",
            "h-10 rounded-xl border border-neutral-200 bg-background px-4 py-2 text-base",
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
          "p-0",
          "rounded-xl border border-neutral-100",
          "shadow-[0_8px_30px_rgba(0,0,0,0.08),_0_0_10px_rgba(0,0,0,0.05)]",
          width
        )}
      >
        <Command>
          <CommandInput 
            ref={inputRef}
            placeholder={placeholder} 
            value={searchTerm}
            onValueChange={setSearchTerm}
            className="h-10 rounded-t-xl rounded-b-none border-b border-neutral-100"
          />
          <CommandEmpty className="py-2 text-sm text-center text-neutral-500">
            {emptyText}
            {showAddNew && searchTerm && (
              <div 
                className="flex items-center justify-center mt-1 p-1.5 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors"
                onClick={() => handleSelect("add-new")}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5 text-primary" />
                <span className="text-primary">Add "{searchTerm}"</span>
              </div>
            )}
          </CommandEmpty>
          <CommandGroup
            className="max-h-[200px] overflow-y-auto p-1"
          >
            {filteredOptions.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={handleSelect}
                className={cn(
                  "rounded-lg py-2 pl-8 pr-3 text-sm",
                  "transition-colors duration-150 ease-out",
                  "outline-none hover:bg-neutral-50 aria-selected:bg-primary/5",
                  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                )}
              >
                {option.label}
                <Check
                  className={cn(
                    "ml-auto h-4 w-4 text-primary",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
            {showAddNew && searchTerm && filteredOptions.length > 0 && (
              <CommandItem
                key="add-new"
                value="add-new"
                onSelect={handleSelect}
                className={cn(
                  "rounded-lg py-2 px-3 text-sm flex items-center justify-center",
                  "transition-colors duration-150 ease-out",
                  "outline-none hover:bg-neutral-50 text-primary"
                )}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                <span>Add "{searchTerm}"</span>
              </CommandItem>
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}