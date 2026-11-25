import { useEffect, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { SITE_NAME, SITE_URL } from '../site';
import { TOOL_LINKS, metaFor } from '../meta';
import { attribution } from '../lib/track';

function Logo() {
  return (
    <Link to="/" className="flex min-h-[44px] items-center gap-2 font-extrabold tracking-tight text-ink-900" aria-label={`${SITE_NAME} home`}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#1d4ed8" />
        <circle cx="16" cy="16" r="9" fill="none" stroke="#fff" strokeWidth="2.5" />
        <path d="M16 11v5.5l3.5 2" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span className="text-lg">Hour<span className="text-brand-600">Tally</span></span>
    </Link>
  );
}

/** Keeps <title>, description and canonical in sync on client-side navigation. */
function useHead() {
  const { pathname } = useLocation();
  useEffect(() => {
    const m = metaFor(pathname);
    document.title = m.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', m.description);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', SITE_URL + m.path);
    if (location.hash.length > 1 && !location.hash.includes('=')) document.getElementById(location.hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname]);
}

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const m = metaFor(pathname);
  if (m.path === '/') return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-3 text-sm text-ink-500">
      <ol className="flex flex-wrap items-center gap-1">
        <li><Link to="/" className="hover:text-brand-700 hover:underline">Home</Link></li>
        <li aria-hidden>›</li>
        <li aria-current="page" className="text-ink-700">{m.crumb}</li>
      </ol>
    </nav>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  useHead();
  // Classify the visit once (from ?ref / referrer) and tidy the ?ref tag out of the address bar.
  useEffect(() => { attribution(); }, []);
  const wide = !!metaFor(useLocation().pathname).wide;
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-ink-300/50 bg-white/95 backdrop-blur">
        <div className={`mx-auto flex ${wide ? 'max-w-6xl' : 'max-w-3xl'} items-center justify-between gap-2 px-4`}>
          <Logo />
          <nav aria-label="Main" className="flex items-center text-sm font-semibold">
            <NavLink to="/" end className={({ isActive }) => `hidden min-h-[44px] items-center rounded-lg px-2.5 sm:flex ${isActive ? 'text-brand-700' : 'text-ink-700 hover:text-brand-700'}`}>Calculator</NavLink>
            <a href="#tools" className="flex min-h-[44px] items-center rounded-lg px-2.5 text-ink-700 hover:text-brand-700">Tools</a>
            <Link to="/#help" className="flex min-h-[44px] items-center rounded-lg px-2.5 text-ink-700 hover:text-brand-700">Help</Link>
            <NavLink to="/saved/" className={({ isActive }) => `flex min-h-[44px] items-center rounded-lg px-2.5 ${isActive ? 'text-brand-700' : 'text-ink-700 hover:text-brand-700'}`}><span className="sm:hidden">Saved</span><span className="hidden sm:inline">My timesheets</span></NavLink>
          </nav>
        </div>
      </header>
      <main id="main" className={`mx-auto w-full ${wide ? 'max-w-6xl' : 'max-w-3xl'} flex-1 px-4 pb-40 pt-5 lg:pb-24`}>
        <Breadcrumbs />
        {children}
      </main>
      <footer className="border-t border-ink-300/50 bg-white pb-28 lg:pb-6">
        <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-ink-700">
          <h2 id="tools" className="mb-2 scroll-mt-20 font-bold text-ink-900">Free tools</h2>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {TOOL_LINKS.map((t) => <li key={t.path}><Link to={t.path} className="inline-flex min-h-[36px] items-center hover:text-brand-700 hover:underline">{t.crumb}</Link></li>)}
          </ul>
          <p className="mt-6 text-xs leading-relaxed text-ink-500">
            {SITE_NAME} gives estimates to help you check hours and pay. It is not payroll, tax or legal advice, and overtime rules vary by
            location and employer. Your timesheets are stored only on this device. <Link to="/privacy/" className="underline">Privacy</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
