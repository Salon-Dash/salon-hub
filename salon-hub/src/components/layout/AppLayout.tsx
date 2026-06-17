import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="h-screen bg-background relative">
      <Sidebar />
      <main className="absolute left-[72px] right-0 top-0 bottom-0 bg-white overflow-auto">
        {children}
      </main>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header className={cn(
      "flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-card via-card to-card/95 backdrop-blur-sm px-6 py-5 shadow-sm",
      className
    )}>
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-muted-foreground font-medium">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
}
