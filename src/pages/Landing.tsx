import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { 
  Sparkles, 
  Languages, 
  RefreshCw, 
  Brain, 
  FolderKanban, 
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { prefersReducedMotion, staggerContainer, staggerItem } from '@/lib/motion';

export default function Landing() {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isRTL = i18n.dir() === 'rtl';
  const reducedMotion = prefersReducedMotion();

  // Parallax scroll effect for hero
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, reducedMotion ? 0 : -30]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, reducedMotion ? 1 : 0.7]);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleTryNow = () => {
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
    },
    {
      icon: RefreshCw,
      titleKey: 'landing.features.models.title',
      descKey: 'landing.features.models.description',
    },
    {
      icon: Brain,
      titleKey: 'landing.features.memory.title',
      descKey: 'landing.features.memory.description',
    },
    {
      icon: FolderKanban,
      titleKey: 'landing.features.projects.title',
      descKey: 'landing.features.projects.description',
    },
    {
      icon: DollarSign,
      titleKey: 'landing.features.pricing.title',
      descKey: 'landing.features.pricing.description',
    },
  ];

  const MotionDiv = reducedMotion ? 'div' : motion.div;

  return (
    <div className="min-h-screen bg-background" dir={i18n.dir()}>
      {/* Header — Glass Nav */}
      <header className="fixed top-0 inset-x-0 z-50 glass-subtle border-b border-border/30">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">{t('landing.brand')}</span>
          </div>
          <div className="flex items-center gap-4">
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

      {/* Hero Section — Clean, Premium with Parallax */}
      <section className="pt-40 pb-24 px-6 relative overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 start-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        <motion.div 
          className="container mx-auto text-center relative z-10 max-w-3xl"
          style={reducedMotion ? {} : { y: heroY, opacity: heroOpacity }}
        >
          {/* Glass pill badge */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm text-muted-foreground mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {t('landing.badge')}
            </div>
          </motion.div>
          
          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-semibold mb-6 leading-tight tracking-tight"
            initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {t('landing.headline')}
          </motion.h1>
          
          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {t('landing.subheadline')}
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Button size="lg" className="gap-2 text-base" onClick={handleTryNow}>
              {t('landing.tryNow')}
              <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
            <Button size="lg" variant="glass" onClick={handleSignUp}>
              {t('landing.signUpFree')}
            </Button>
          </motion.div>

          <motion.p
            className="mt-6 text-sm text-muted-foreground"
            initial={reducedMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {t('landing.trialInfo')} · {t('landing.creditInfo')}
          </motion.p>
        </motion.div>
      </section>

      {/* Features Section — Glass Cards with Stagger */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            className="text-center mb-16"
            initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-semibold mb-4">{t('landing.featuresTitle')}</h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              {t('landing.featuresSubtitle')}
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={staggerItem}
                className="glass-card p-8 group"
                whileHover={reducedMotion ? {} : { y: -4, scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-medium mb-2">{t(feature.titleKey)}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t(feature.descKey)}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <motion.div
          className="container mx-auto max-w-2xl text-center"
          initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-semibold mb-4">{t('landing.ctaTitle')}</h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t('landing.ctaSubtitle')}
          </p>
          <Button size="lg" className="gap-2" onClick={handleTryNow}>
            {t('landing.startNow')}
            <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        </motion.div>
      </section>

      {/* Footer — Minimal */}
      <footer className="py-8 px-6 border-t border-border/30">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {t('landing.brand')}. {t('landing.rights')}</p>
        </div>
      </footer>
    </div>
  );
}
