import React, { useState, useEffect } from 'react';
import { apiUrl } from '@/config/api';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ChevronRight, Moon, Globe, DollarSign, Info, Settings as SettingsIcon, LogIn, LogOut, Users, Plus, Trash2, ShieldCheck, UtensilsCrossed, DoorOpen, BellRing } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser, type AdminRole } from '@/contexts/UserContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';

interface AdminUser {
  id: number;
  email: string;
  username: string;
  role: string;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'General Admin',
  admin_room: 'Room Manager',
  admin_food: 'F&B Manager',
  admin_waiter: 'Waiter Manager',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  admin_room: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  admin_food: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  admin_waiter: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin: <ShieldCheck className="h-3.5 w-3.5" />,
  admin_room: <DoorOpen className="h-3.5 w-3.5" />,
  admin_food: <UtensilsCrossed className="h-3.5 w-3.5" />,
  admin_waiter: <BellRing className="h-3.5 w-3.5" />,
};

const Profile = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, setUser, isAnyAdmin } = useUser();
  const { currency } = useCurrency();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);

  // Admin management state
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<string>('admin_room');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

  const handleAdminPanelClick = () => {
    if (isAnyAdmin()) {
      navigate('/admin');
    } else {
      toast.error("You must be an administrator to access this page.");
    }
  };

  const clearForm = () => {
    setEmail('');
    setUsername('');
    setPassword('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      clearForm();
      setAuthMode('login');
    }
    setIsAuthDialogOpen(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'login') {
      handleSignIn();
    } else {
      handleRegister();
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      toast.error("Please enter email and password.");
      return;
    }
    try {
      const response = await fetch(apiUrl('/users?action=login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setUser(data.user);
        toast.success(`Welcome back, ${data.user.username}!`);
        handleOpenChange(false);
      } else {
        toast.error(data.error || "Login failed.");
      }
    } catch (err) {
      toast.error("An error occurred during login.");
    }
  };

  const handleRegister = async () => {
    if (!email || !username || !password) {
      toast.error("Please fill all fields for registration.");
      return;
    }
    try {
      const response = await fetch(apiUrl('/users?action=register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setUser(data.user);
        toast.success(`Account created! Welcome, ${data.user.username}!`);
        handleOpenChange(false);
      } else {
        toast.error(data.error || "Registration failed.");
      }
    } catch (err) {
      toast.error("An error occurred during registration.");
    }
  };

  const handleSignOut = () => {
    setUser(null);
    toast.info("You have been signed out.");
  };

  // ===== Admin Management Functions =====
  const fetchAdmins = async () => {
    setAdminsLoading(true);
    try {
      const res = await fetch(apiUrl('/users?action=list_admins'));
      if (res.ok) {
        const data = await res.json();
        setAdmins(data);
      }
    } catch (e) {
      toast.error("Failed to load admin list");
    }
    setAdminsLoading(false);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminUsername || !newAdminPassword || !newAdminRole) {
      toast.error("Please fill all fields");
      return;
    }
    setIsAddingAdmin(true);
    try {
      const res = await fetch(apiUrl('/users?action=create_admin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newAdminEmail,
          username: newAdminUsername,
          password: newAdminPassword,
          role: newAdminRole,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Admin "${newAdminUsername}" created!`);
        setNewAdminEmail('');
        setNewAdminUsername('');
        setNewAdminPassword('');
        setNewAdminRole('admin_room');
        fetchAdmins();
      } else {
        toast.error(data.error || "Failed to create admin");
      }
    } catch (e) {
      toast.error("Error creating admin");
    }
    setIsAddingAdmin(false);
  };

  const handleDeleteAdmin = async (adminId: number) => {
    if (adminId === user?.id) {
      toast.error("You cannot delete yourself!");
      return;
    }
    try {
      const res = await fetch(apiUrl('/users?action=delete_admin'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: adminId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Admin removed");
        fetchAdmins();
      } else {
        toast.error(data.error || "Failed to remove admin");
      }
    } catch (e) {
      toast.error("Error removing admin");
    }
  };

  useEffect(() => {
    if (isAdminDialogOpen && user?.role === 'admin') {
      fetchAdmins();
    }
  }, [isAdminDialogOpen]);

  // Get the admin role label for the user card
  const getUserRoleLabel = () => {
    if (!user) return '';
    return ROLE_LABELS[user.role] || '';
  };

  return (
    <div className="bg-background flex max-w-[480px] md:max-w-full w-full flex-col overflow-hidden mx-auto min-h-screen pb-28">
      <main className="flex flex-col w-full flex-1 px-5 md:px-8 lg:px-12 xl:px-16 pt-14">
        {/* Page title */}
        <h1 className="text-2xl font-bold text-foreground mb-6">Profile</h1>

        {/* Responsive layout container */}
        <div className="md:grid md:grid-cols-2 md:gap-8 md:items-start">
          
          {/* Left Column: User Card & Welcome Block */}
          <div className="mb-6 md:mb-0 md:sticky md:top-24">
            {/* User card */}
            <div className="bg-card rounded-2xl p-4 flex items-center gap-4 border border-border/50">
              {user ? (
                <>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                    style={{ background: '#2d6a4f' }}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{user.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    {isAnyAdmin() && (
                      <span className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${ROLE_COLORS[user.role] || 'bg-golden/20 text-golden'}`}>
                        {ROLE_ICONS[user.role]}
                        {getUserRoleLabel()}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="shrink-0 text-xs rounded-full border-border"
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                    style={{ background: '#2d6a4f' }}
                  >
                    G
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">Guest</p>
                    <p className="text-xs text-muted-foreground">Become Our customer by creating account</p>
                  </div>
                  <Dialog open={isAuthDialogOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="shrink-0 text-xs rounded-full bg-foreground text-background hover:bg-foreground/90"
                        onClick={() => setIsAuthDialogOpen(true)}
                      >
                        Sign in/Register
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] rounded-2xl">
                      <DialogHeader>
                        <DialogTitle>{authMode === 'login' ? t('settings.dialog.login_title') : t('settings.dialog.register_title')}</DialogTitle>
                        <DialogDescription>
                          {authMode === 'login' ? t('settings.dialog.login_description') : t('settings.dialog.register_description')}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                          {authMode === 'register' && (
                            <Input
                              id="username"
                              type="text"
                              placeholder={t('settings.dialog.username_placeholder')}
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              required
                              className="rounded-xl"
                            />
                          )}
                          <Input
                            id="email"
                            type="email"
                            placeholder={t('settings.dialog.email_placeholder')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="rounded-xl"
                          />
                          <Input
                            id="password"
                            type="password"
                            placeholder={t('settings.dialog.password_placeholder')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="rounded-xl"
                          />
                        </div>
                        <DialogFooter className="flex-col gap-2">
                          <Button type="submit" className="w-full rounded-xl">{authMode === 'login' ? t('settings.dialog.login_title') : t('settings.dialog.register_button')}</Button>
                          <Button type="button" variant="link" size="sm" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                            {authMode === 'login' ? t('settings.dialog.login_switch') : t('settings.dialog.register_switch')}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>

            {/* Desktop-only welcome info card */}
            <div className="hidden md:block mt-6 p-5 rounded-2xl bg-muted/40 border border-border/50 text-xs text-muted-foreground font-medium leading-relaxed">
              <div className="flex items-center gap-2 mb-2.5">
                <SettingsIcon className="w-4 h-4 text-primary" />
                <span className="font-bold text-[10px] uppercase tracking-wider text-foreground">Royal Premium Settings</span>
              </div>
              Manage your language choices, base currency conversions, and read about our history. Administrators can also access the order management panel and manage user roles.
            </div>
          </div>

          {/* Right Column: Settings & Preferences */}
          <div>
            {/* Preferences section */}
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider pl-1">Preferences</h2>
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden mb-5">
              {/* Dark Mode toggle */}
              <div className="flex items-center gap-4 px-4 py-3.5">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Moon className="h-4 w-4 text-foreground" />
                </div>
                <span className="flex-1 text-sm font-medium text-foreground">Dark Mode</span>
                <button
                  onClick={toggleTheme}
                  className={`ios-toggle ${theme === 'dark' ? 'active' : ''}`}
                  aria-label="Toggle dark mode"
                />
              </div>

              <div className="h-px bg-border mx-4" />

              {/* Language */}
              <button 
                onClick={() => navigate('/settings/language')}
                className="flex items-center gap-4 px-4 py-3.5 w-full hover:bg-accent/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Globe className="h-4 w-4 text-foreground" />
                </div>
                <span className="flex-1 text-sm font-medium text-foreground text-left">Language</span>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-bold text-muted-foreground uppercase">{i18n.language}</span>
                   <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>

              <div className="h-px bg-border mx-4" />

              {/* Currency */}
              <button 
                onClick={() => navigate('/settings/currency')}
                className="flex items-center gap-4 px-4 py-3.5 w-full hover:bg-accent/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-foreground" />
                </div>
                <span className="flex-1 text-sm font-medium text-foreground text-left">Currency</span>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-bold text-muted-foreground uppercase">{currency}</span>
                   <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            </div>

            {/* About us Section */}
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden mb-5">
              <button 
                onClick={() => navigate('/settings/about')}
                className="flex items-center gap-4 px-4 py-3.5 w-full hover:bg-accent/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Info className="h-4 w-4 text-foreground" />
                </div>
                <span className="flex-1 text-sm font-medium text-foreground text-left">About Us</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Admin Panel (for any admin role) */}
            {isAnyAdmin() && (
              <div className="mb-5 scale-in animate-in fade-in duration-300">
                <h2 className="text-[10px] font-bold text-muted-foreground mb-2.5 uppercase tracking-widest px-1">Administrative</h2>
                
                {/* Admin Panel Link */}
                <div 
                  className="group flex items-center justify-between bg-card p-3.5 rounded-2xl border border-golden/20 cursor-pointer hover:bg-golden/5 transition-all active:scale-[0.98] shadow-sm mb-3"
                  onClick={handleAdminPanelClick}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-golden/10 flex items-center justify-center text-golden group-hover:scale-110 transition-transform">
                      <SettingsIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Admin Panel</h3>
                      <p className="text-[10px] text-muted-foreground">Manage products & orders</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:translate-x-1 transition-transform" />
                </div>

                {/* Manage Admins — Only for General Admin */}
                {user?.role === 'admin' && (
                  <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
                    <DialogTrigger asChild>
                      <div 
                        className="group flex items-center justify-between bg-card p-3.5 rounded-2xl border border-blue-500/20 cursor-pointer hover:bg-blue-500/5 transition-all active:scale-[0.98] shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-foreground">Manage Admins</h3>
                            <p className="text-[10px] text-muted-foreground">Add or remove admin accounts</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </DialogTrigger>

                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Manage Admins</DialogTitle>
                    <DialogDescription>
                      Create and manage administrator accounts with different roles.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Add Admin Form */}
                  <form onSubmit={handleCreateAdmin} className="space-y-3 p-4 bg-muted/30 rounded-xl border mt-2">
                    <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Create New Admin</h3>
                    <Input
                      placeholder="Username"
                      value={newAdminUsername}
                      onChange={(e) => setNewAdminUsername(e.target.value)}
                      required
                      className="h-11"
                    />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      required
                      className="h-11"
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      required
                      className="h-11"
                    />
                    <Select value={newAdminRole} onValueChange={setNewAdminRole}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                            General Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="admin_room">
                          <div className="flex items-center gap-2">
                            <DoorOpen className="h-3.5 w-3.5 text-blue-500" />
                            Room Manager
                          </div>
                        </SelectItem>
                        <SelectItem value="admin_food">
                          <div className="flex items-center gap-2">
                            <UtensilsCrossed className="h-3.5 w-3.5 text-emerald-500" />
                            Food & Drinks Manager
                          </div>
                        </SelectItem>
                        <SelectItem value="admin_waiter">
                          <div className="flex items-center gap-2">
                            <BellRing className="h-3.5 w-3.5 text-purple-500" />
                            Waiter Calls Manager
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      type="submit" 
                      className="w-full h-11 font-bold" 
                      disabled={isAddingAdmin}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {isAddingAdmin ? 'Creating...' : 'Create Admin'}
                    </Button>
                  </form>

                  {/* Existing Admins List */}
                  <div className="space-y-2 mt-4">
                    <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest px-1">
                      Current Admins ({admins.length})
                    </h3>
                    
                    {adminsLoading && <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>}
                    
                    {!adminsLoading && admins.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No admin accounts found.</p>
                    )}

                    {admins.map((admin) => (
                      <div 
                        key={admin.id} 
                        className="flex items-center gap-3 p-3 bg-card rounded-xl border transition-all hover:shadow-sm"
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                          style={{ background: admin.role === 'admin' ? '#b45309' : admin.role === 'admin_room' ? '#2563eb' : admin.role === 'admin_food' ? '#059669' : '#7c3aed' }}
                        >
                          {admin.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{admin.username}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{admin.email}</p>
                          <Badge 
                            variant="outline" 
                            className={`mt-1 text-[9px] h-5 ${ROLE_COLORS[admin.role] || ''}`}
                          >
                            {ROLE_ICONS[admin.role]}
                            <span className="ml-1">{ROLE_LABELS[admin.role] || admin.role}</span>
                          </Badge>
                        </div>
                        {admin.id !== user?.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Admin</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove "{admin.username}" as an admin? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteAdmin(admin.id)}>Remove</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {admin.id === user?.id && (
                          <Badge variant="outline" className="text-[9px] shrink-0">YOU</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
          </div> {/* end right column */}
        </div> {/* end md:grid two-column wrapper */}
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Profile;
