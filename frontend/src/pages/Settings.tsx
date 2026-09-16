import React, { useState } from 'react';
import { apiUrl } from '@/config/api';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { ChevronRight, Settings as SettingsIcon, LogIn, LogOut, Globe, DollarSign, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, setUser } = useUser();
  const { currency } = useCurrency();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);

  const handleAdminPanelClick = () => {
    if (user?.role === 'admin') {
      navigate('/admin');
    } else {
      toast.error("You must be an administrator to access this page.");
    }
  };

  const clearForm = () => {
      setEmail('');
      setUsername('');
      setPassword('');
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        clearForm();
        setAuthMode('login');
    }
    setIsAuthDialogOpen(isOpen);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'login') {
        handleSignIn();
    } else {
        handleRegister();
    }
  }
  
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
  }
  
  const handleSignOut = () => {
    setUser(null);
    toast.info("You have been signed out.");
  };

  return (
    <div className="bg-background flex max-w-[480px] w-full flex-col overflow-hidden items-center mx-auto pt-4 min-h-screen">
      <Header />
      
      <main className="flex flex-col w-full flex-1 px-6 py-6 pb-24">
        <h1 className="text-2xl font-semibold text-foreground mb-6">{t('settings.title')}</h1>
        
        <div className="mb-8">
          <h2 className="text-lg font-medium text-foreground mb-4">{t('settings.account_heading')}</h2>
          <div className="bg-card p-4 rounded-lg border">
            {user ? (
              <div className="flex flex-col gap-4">
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">{t('settings.signed_in_as')}</p>
                    <p className="text-lg font-medium text-foreground">{user.username}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {user.role === 'admin' && (
                        <span className="mt-2 inline-block bg-golden/20 text-golden px-3 py-1 rounded-full text-xs font-medium">
                            {t('settings.admin_badge')}
                        </span>
                    )}
                </div>
                <Button variant="destructive" className="w-full" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('settings.sign_out_button')}
                </Button>
              </div>
            ) : (
                <Dialog open={isAuthDialogOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button className="w-full" onClick={() => setIsAuthDialogOpen(true)}>
                            <LogIn className="mr-2 h-4 w-4" />
                            {t('settings.sign_in_button')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
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
                                    />
                                )}
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder={t('settings.dialog.email_placeholder')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder={t('settings.dialog.password_placeholder')}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <DialogFooter className="flex-col gap-2">
                                <Button type="submit" className="w-full">{authMode === 'login' ? t('settings.dialog.login_title') : t('settings.dialog.register_button')}</Button>
                                <Button type="button" variant="link" size="sm" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                                    {authMode === 'login' ? t('settings.dialog.login_switch') : t('settings.dialog.register_switch')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
          </div>
        </div>
        
        {user?.role === 'admin' && (
          <div className="mb-8 scale-in">
            <h2 className="text-lg font-medium text-foreground mb-4 uppercase tracking-tight text-xs opacity-70">Administrative</h2>
            <div 
              className="group flex items-center justify-between bg-card p-4 rounded-xl border border-golden/30 cursor-pointer hover:bg-golden/5 transition-all active:scale-[0.98] shadow-sm"
              onClick={handleAdminPanelClick}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-golden/20 flex items-center justify-center text-golden group-hover:scale-110 transition-transform">
                  <SettingsIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{t('settings.admin_panel')}</h3>
                  <p className="text-xs text-muted-foreground">Manage products, orders, and feedback</p>
                </div>
              </div>
              <div className="bg-muted w-8 h-8 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-lg font-medium text-foreground mb-4">{t('settings.quick_settings_heading')}</h2>
          <div className="flex items-center justify-between bg-card p-4 rounded-lg border">
            <div>
              <h3 className="font-medium text-foreground">{t('settings.dark_mode')}</h3>
              <p className="text-sm text-muted-foreground">{t('settings.dark_mode_description')}</p>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
          </div>
        </div>

        <div className="space-y-3">
            <div className="flex items-center justify-between bg-card p-4 rounded-lg border cursor-pointer hover:bg-accent transition-colors">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-medium text-foreground">Language</h3>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>

            <div 
                className="flex items-center justify-between bg-card p-4 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                onClick={() => navigate('/settings/currency')}
            >
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-medium text-foreground">Currency</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase">{currency}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            <div className="flex items-center justify-between bg-card p-4 rounded-lg border cursor-pointer hover:bg-accent transition-colors">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-medium text-foreground">About Us</h3>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
        </div>
      </main>
      
      <BottomNavigation />
    </div>
  );
};

export default Settings;
