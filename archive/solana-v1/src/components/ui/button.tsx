import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans text-[14px] font-bold tracking-[0.02em] transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "h-12 rounded-[2px] bg-[#F5F5F5] px-7 text-[#1A1A1A] hover:bg-[#FFB81C] hover:text-[#0A0A0A]",
        accent: "h-12 rounded-[2px] bg-[#FFB81C] px-7 text-[#0A0A0A] hover:bg-[#F5F5F5]",
        default: "h-12 rounded-[2px] bg-[#FFB81C] px-7 text-[#0A0A0A] hover:bg-[#F5F5F5]",
        link: "h-auto rounded-none bg-transparent px-0 text-[#F5F5F5] underline decoration-1 underline-offset-[5px] hover:text-[#FFB81C]",
        ghost: "h-10 rounded-[2px] bg-transparent px-3 text-[#9CA3AF] hover:text-[#F5F5F5]",
        outline: "h-12 rounded-[2px] border border-[#2B313B] bg-transparent px-7 text-[#F5F5F5] hover:border-[#FFB81C]",
        danger: "h-12 rounded-[2px] bg-transparent px-4 text-[#EF4444] hover:bg-[#1A1A1A]",
      },
      size: {
        default: "",
        sm: "h-10 px-4 text-[12px]",
        lg: "",
        icon: "size-10 px-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);

Button.displayName = "Button";
