import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLDivElement>;
}

export function Card({ children, className = "", style, ref }: CardProps) {
  return (
    <div ref={ref} className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`} style={style}>
      {children}
    </div>
  );
}
