import { Link } from "react-router-dom";
import { LucideIcon, ArrowRight } from "lucide-react";

interface ToolCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: "primary" | "secondary" | "accent";
}

const colorClasses = {
  primary: "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
  secondary: "bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground",
  accent: "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground",
};

export function ToolCard({ title, description, icon: Icon, href, color }: ToolCardProps) {
  return (
    <Link to={href} className="group tool-card block h-full">
      <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-300 ${colorClasses[color]}`}>
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-all duration-300 group-hover:opacity-100">
        Try it now
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
