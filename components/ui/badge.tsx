interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline" | "accent" | "success";
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors";
  
  const variants = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    outline: "border border-primary text-primary",
    accent: "bg-accent text-accent-foreground",
    success: "bg-emerald-500 text-white",
  };

  return <span className={`${baseClasses} ${variants[variant]} ${className}`}>{children}</span>;
}
