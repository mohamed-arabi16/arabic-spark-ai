import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { z } from 'zod';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function Auth() {
  const { t } = useTranslation();
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    const emailSchema = z.string().email(t('validation.invalidEmail'));
    const passwordSchema = z.string().min(6, t('validation.passwordLength'));

    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const { error } = await signInWithEmail(email, password);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error(t('auth.invalidCredentials'));
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success(t('auth.welcomeBack'));
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const { error } = await signUpWithEmail(email, password, fullName);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error(t('auth.alreadyRegistered'));
        setActiveTab('signin');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success(t('auth.accountCreated'));
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setIsSubmitting(false);
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 relative">
      {/* Language switcher */}
      <div className="absolute top-6 end-6 z-50">
        <LanguageSwitcher />
      </div>

      {/* Subtle background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 start-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <div className="relative z-10 mb-10 text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold">{t('sidebar.workspace')}</span>
        </div>
        <p className="text-muted-foreground text-sm">{t('auth.welcomeDescription')}</p>
      </div>

      {/* Auth card — Glass */}
      <div className="relative z-10 w-full max-w-sm glass-card p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-1">{t('auth.welcomeTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('auth.welcomeDescription')}</p>
        </div>

        {/* Google sign in */}
        <Button
          variant="glass"
          className="w-full h-11 gap-3"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {t('common.continueWithGoogle')}
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-transparent px-3 text-muted-foreground">{t('common.orContinueWith')}</span>
          </div>
        </div>

        {/* Email/Password tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'signin' | 'signup')}>
          <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-secondary/50">
            <TabsTrigger value="signin" className="text-sm">{t('common.signIn')}</TabsTrigger>
            <TabsTrigger value="signup" className="text-sm">{t('common.signUp')}</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4 pt-4">
            <form onSubmit={handleEmailSignIn} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-sm">{t('common.email')}</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-sm">{t('common.password')}</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.signIn')}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 pt-4">
            <form onSubmit={handleEmailSignUp} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-sm">{t('common.fullName')}</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder={t('auth.namePlaceholder')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-sm">{t('common.email')}</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-sm">{t('common.password')}</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.createAccount')}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Trial option */}
        <div className="pt-4 border-t border-border/50 space-y-3">
          <Button
            variant="secondary"
            className="w-full gap-2"
            onClick={() => {
              const sessionId = crypto.randomUUID();
              localStorage.setItem('anonymous_session_id', sessionId);
              localStorage.setItem('trial_started', 'true');
              navigate('/chat');
            }}
          >
            <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
            {t('auth.tryWithoutAccount')}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            {t('auth.trialLimit')}
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-xs text-muted-foreground text-center max-w-xs">
        {t('auth.terms')}
      </p>
    </div>
  );
}
