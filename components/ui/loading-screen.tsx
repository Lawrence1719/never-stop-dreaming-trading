"use client";

import { Logo } from "@/components/ui/logo";

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({
  message = "One Moment",
  subMessage = "Preparing your experience...",
  fullScreen = true,
}: LoadingScreenProps) {
  const containerClasses = fullScreen
    ? "flex h-screen w-full bg-background items-center justify-center p-4 z-50 fixed inset-0"
    : "flex min-h-[400px] w-full items-center justify-center p-4";

  return (
    <div className={containerClasses}>
      <div className="text-center animate-in fade-in zoom-in duration-500">
        <div className="bg-card p-12 rounded-3xl border border-border shadow-2xl backdrop-blur-md relative overflow-hidden max-w-sm w-full mx-auto">
          <div className="absolute inset-0 bg-primary/5 -z-10" />
          
          <div className="flex justify-center mb-8">
            <Logo variant="long" className="h-10 w-auto opacity-80" />
          </div>

          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin absolute" />
            <div className="w-6 h-6 bg-primary/20 rounded-full animate-pulse" />
          </div>

          <h2 className="text-2xl font-bold mb-3 tracking-tight">{message}</h2>
          <p className="text-muted-foreground">{subMessage}</p>
          
          <div className="mt-8 flex justify-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
