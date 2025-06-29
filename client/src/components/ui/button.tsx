import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button Variants:
 * - default: Primary blue, rounded - used for main actions
 * - destructive: Strong red, rounded - used for delete/remove actions
 * - outline: White with border, rounded - used for secondary actions
 * - secondary: Light gray, rounded - used for less important actions
 * - ghost: No background/border - used for minimal visual impact
 * - link: Appears as text link - used within text or minimal interfaces
 * - ios: iOS-inspired style with subtle shadow - used for modern UI
 * - success: Green confirmation - used for successful/complete actions
 * - warn: Amber warning - used for caution/warning actions
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-medium",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 rounded-full font-medium",
        outline:
          "border border-neutral-200 bg-background hover:bg-neutral-50 text-neutral-800 rounded-full",
        secondary:
          "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 rounded-xl font-medium",
        ghost: "hover:bg-neutral-100 hover:text-neutral-900 rounded-xl shadow-none",
        link: "text-primary underline-offset-4 hover:underline shadow-none",
        ios: "bg-white border border-neutral-100 text-neutral-900 hover:bg-neutral-50 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04),_0_1px_2px_rgba(0,0,0,0.06)]",
        success: "bg-green-600 text-white hover:bg-green-700 rounded-full font-medium",
        warn: "bg-amber-500 text-white hover:bg-amber-600 rounded-full font-medium",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-11 px-8 py-3 text-base",
        xl: "h-12 px-10 py-3 text-base",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
