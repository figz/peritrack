'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  ClipboardList,
  Pill,
  CalendarHeart,
  BarChart3,
  FlaskConical,
  FileText,
  TestTube2,
  Settings,
  LogOut,
  PlusCircle,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/log/new', label: 'New Check-In', icon: PlusCircle },
  { href: '/log', label: 'Log History', icon: ClipboardList },
  { href: '/medications', label: 'Medications', icon: Pill },
  { href: '/labs', label: 'Lab Results', icon: TestTube2 },
  { href: '/events', label: 'Life Events', icon: CalendarHeart },
  { href: '/charts', label: 'Charts', icon: BarChart3 },
  { href: '/analysis', label: 'Analysis', icon: FlaskConical },
  { href: '/report', label: 'Doctor Report', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-white border-r border-gray-100 shrink-0">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌸</span>
          <div>
            <p className="font-semibold text-gray-900 leading-none">PeriTrack</p>
            <p className="text-xs text-gray-500 mt-0.5">Health Journal</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                active
                  ? 'bg-rose-50 text-rose-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-gray-600 min-h-[44px]"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="w-5 h-5" aria-hidden />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
