import Link from 'next/link';
import { AppNav } from '@/app/(app)/app-nav';
import { GuestNav } from '@/app/(marketing)/marketing-nav';
import { signOut } from '@/app/(auth)/login/actions';
import { ThemeToggle } from '@/components/theme';

/**
 * The one header, for the app and the marketing pages alike.
 *
 * There used to be two, written separately, and they drifted: signed in, the
 * menu sat next to the logo on /bots and jumped to the right edge on / and
 * /try, with the theme switch changing places too. Moving between pages made
 * the header look like it belonged to two different products.
 *
 * Layout, whoever is looking: logo, then the app's sections, then everything
 * else pushed right — with the theme switch always last, so it is found in the
 * same corner every time.
 */
export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="border-line bg-bg/85 sticky top-0 z-10 border-b backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-5">
        {/* The logo goes home, everywhere. */}
        <Link href="/" className="shrink-0 text-sm font-semibold tracking-wide uppercase">
          Docsy
        </Link>

        {signedIn && (
          // Scrolls sideways rather than wrapping on a phone: a header that
          // grows a second line pushes every page down by a different amount.
          <div className="-mx-1 min-w-0 overflow-x-auto px-1">
            <AppNav />
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-4">
          {signedIn ? (
            <form action={signOut}>
              <button type="submit" className="text-muted hover:text-fg text-sm transition">
                Sign out
              </button>
            </form>
          ) : (
            <GuestNav />
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
