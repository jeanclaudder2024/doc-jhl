import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  LogOut, 
  Plus, 
  LayoutDashboard, 
  Settings 
} from 'lucide-react';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth();
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r border-border/40 flex-shrink-0 z-10">
        <div className="p-6 border-b border-border/40">
          <h1 className="text-xl font-display font-bold text-primary tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-serif text-lg">N</div>
            NOVIQ Admin
          </h1>
        </div>

        <nav className="p-4 space-y-1">
          <Link href="/admin">
            <Button 
              variant={isActive('/admin') ? 'secondary' : 'ghost'} 
              className="w-full justify-start font-medium"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link href="/admin/proposals/new">
            <Button 
              variant={isActive('/admin/proposals/new') ? 'secondary' : 'ghost'} 
              className="w-full justify-start font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Proposal
            </Button>
          </Link>
          <div className="pt-4 mt-4 border-t border-border/40">
            <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account</h3>
            <div className="px-4 py-2 flex items-center gap-3 mb-2">
              {user?.profileImageUrl && (
                <img src={user.profileImageUrl} alt="Profile" className="w-8 h-8 rounded-full border border-border" />
              )}
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => logout()}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto h-[calc(100vh-64px)] md:h-screen">
        <div className="container max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
