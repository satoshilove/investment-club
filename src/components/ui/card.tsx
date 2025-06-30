// src/components/ui/card.tsx
import { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-gray-800 rounded-xl shadow-md ${className}`}>
      {children}
    </div>
  );
}

type CardContentProps = {
  children: ReactNode;
};

export function CardContent({ children }: CardContentProps) {
  return <div className="p-4">{children}</div>;
}
