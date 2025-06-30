// src/components/ui/button.tsx
import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = "default",
  size = "default",
  ...props
}) => {
  const base = "inline-flex items-center justify-center font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    default: "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700",
    outline: "border border-white text-white hover:bg-white hover:text-black",
    ghost: "bg-transparent text-white hover:bg-gray-800",
  };

  const sizes = {
    default: "h-10 px-4 text-base",
    sm: "h-8 px-3 text-sm",
    lg: "h-12 px-6 text-lg",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
};
