// src/components/page-header.tsx
import { Logo } from '@/components/icons';

export function PageHeader() {
  return (
    <header className="py-6 px-4 md:px-6 border-b">
      <div className="container mx-auto flex items-center gap-3">
        <Logo className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          AlphaLite
        </h1>
      </div>
    </header>
  );
}
