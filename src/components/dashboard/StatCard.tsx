import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  icon: Icon, 
  color = "bg-black text-white",
  className
}) => {
  return (
    <div className={cn("panel p-6", className)}>
      <div className={cn("mb-4 flex h-11 w-11 items-center justify-center border-2 border-black transition-colors", color)}>
        <Icon size={20} />
      </div>
      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.24em] text-black/55">{label}</p>
      <p className="text-2xl font-black uppercase tracking-tight text-black">{value}</p>
    </div>
  );
};

