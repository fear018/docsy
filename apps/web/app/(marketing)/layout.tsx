import Link from 'next/link';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-line sticky top-0 z-10 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="text-sm font-semibold tracking-wide uppercase">
            Docsy
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <a href="#pricing" className="text-muted hover:text-fg hidden transition sm:block">
              Pricing
            </a>
            <a href="#faq" className="text-muted hover:text-fg hidden transition sm:block">
              FAQ
            </a>
            <Link href="/login" className="font-medium">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="border-line border-t">
        <div className="text-muted mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm">
          <span>Docsy — answers from your own documentation.</span>
          <nav className="flex gap-4">
            <Link href="/privacy" className="hover:text-fg transition">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-fg transition">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
