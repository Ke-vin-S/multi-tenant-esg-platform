'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const SUBSIDIARY_LINKS = [
  { href: '/overview',      label: 'Overview',      icon: '◐' },
  { href: '/data-entry',    label: 'Data Entry',    icon: '✎' },
  { href: '/audit-ledger',  label: 'Audit Ledger',  icon: '☰' },
];

const GLOBAL_LINKS = [
  { href: '/global',                  label: 'Global Overview', icon: '◉' },
  { href: '/global/sector/FINANCIAL', label: 'Financial',       icon: '$' },
  { href: '/global/sector/AGRICULTURE', label: 'Agriculture',   icon: '🌱' },
  { href: '/global/sector/LEISURE',   label: 'Leisure',         icon: '☼' },
  { href: '/global/tenants',          label: 'Tenants',         icon: '☷' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const showGlobal = user?.role === 'CORPORATE_ANALYST' || user?.role === 'GLOBAL_ADMIN';

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-200 bg-white md:flex">
      <div className="border-b border-ink-200 px-5 py-4">
        <div className="text-base font-semibold text-ink-900">ESG Platform</div>
        <div className="text-xs text-ink-500">Carbon · Compliance · Aggregation</div>
      </div>

      <nav className="flex-1 space-y-6 px-3 py-4">
        <SidebarSection title="Subsidiary">
          {SUBSIDIARY_LINKS.map((l) => (
            <SidebarLink key={l.href} {...l} active={pathname === l.href || pathname.startsWith(l.href + '/')} />
          ))}
        </SidebarSection>

        {showGlobal && (
          <SidebarSection title="Group">
            {GLOBAL_LINKS.map((l) => (
              <SidebarLink key={l.href} {...l} active={pathname === l.href} />
            ))}
          </SidebarSection>
        )}
      </nav>

      <div className="border-t border-ink-200 px-5 py-3 text-[10px] text-ink-400">
        v0.1 · PoC build
      </div>
    </aside>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-3 pb-2 text-[11px] font-semibold tracking-wide text-ink-400 uppercase">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SidebarLink({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-ring',
        active ? 'bg-brand-50 text-brand-800' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
      )}
    >
      <span className="w-5 text-center text-base text-ink-400">{icon}</span>
      {label}
    </Link>
  );
}
