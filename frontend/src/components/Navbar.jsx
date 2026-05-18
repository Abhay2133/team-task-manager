import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useAuthStore from '@/store/authStore';

export default function Navbar() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const logout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <header className="border-b bg-white sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/dashboard" className="font-bold text-lg text-primary">
          TaskFlow
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard"><LayoutDashboard className="h-4 w-4 mr-1" />Dashboard</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/projects"><FolderKanban className="h-4 w-4 mr-1" />Projects</Link>
          </Button>
          <span className="text-sm text-muted-foreground ml-2">{user?.name}</span>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    </header>
  );
}
