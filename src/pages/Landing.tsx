import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { 
  Sparkles, 
  Languages, 
  RefreshCw, 
  Brain, 
  FolderKanban, 
  DollarSign,
  MessageSquare,
  ArrowRight,
  Check
} from 'lucide-react';

export default function Landing() {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isRTL = i18n.dir() === 'rtl';

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleTryNow = () => {
    // Generate anonymous session ID
    const sessionId = crypto.randomUUID();
    localStorage.setItem('anonymous_session_id', sessionId);
    localStorage.setItem('trial_started', 'true');
    navigate('/chat');
  };

  const handleSignUp = () => {
    navigate('/auth');
  };

  const features = [
    {
      icon: Languages,
      titleKey: 'landing.features.dialects.title',
      descKey: 'landing.features.dialects.description',
      color: 'text-emerald-500',
    },
    {
      icon: RefreshCw,
      titleKey: 'landing.features.models.title',
      descKey: 'landing.features.models.description',
      color: 'text-blue-500',
    },
    {
      icon: Brain,
      titleKey: 'landing.features.memory.title',
      descKey: 'landing.features.memory.description',
      color: 'text-purple-500',
    },
    {
      icon: FolderKanban,
      titleKey: 'landing.features.projects.title',
      descKey: 'landing.features.projects.description',
      color: 'text-orange-500',
    },
    {
      icon: DollarSign,
      titleKey: 'landing.features.pricing.title',
      descKey: 'landing.features.pricing.description',
      color: 'text-green-500',
    },
  ];

  return (
    <div className="min-h-screen bg-background" dir={i18n.dir()}>
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">{t('landing.brand')}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" onClick={handleSignUp}>
              {t('common.signIn')}
            </Button>
            <Button onClick={handleTryNow}>
              {t('landing.tryNow')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 start-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 end-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto text-center relative z-10">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5">
            <MessageSquare className="h-3.5 w-3.5 me-2" />
            {t('landing.badge')}
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            {t('landing.headline')}
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            {t('landing.subheadline')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button size="lg" className="gap-2 text-lg px-8" onClick={handleTryNow}>
              {t('landing.tryNow')}
              <ArrowRight className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" onClick={handleSignUp}>
              {t('landing.signUpFree')}
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>{t('landing.trialInfo')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>{t('landing.creditInfo')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{t('landing.featuresTitle')}</h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              {t('landing.featuresSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/50 hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className={`w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4 ${feature.color}`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{t(feature.titleKey)}</h3>
                  <p className="text-muted-foreground">{t(feature.descKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">{t('landing.ctaTitle')}</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
            {t('landing.ctaSubtitle')}
          </p>
          <Button size="lg" className="gap-2 text-lg px-8" onClick={handleTryNow}>
            {t('landing.startNow')}
            <ArrowRight className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {t('landing.brand')}. {t('landing.rights')}</p>
        </div>
      </footer>
    </div>
  );
}
