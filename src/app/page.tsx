'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  Trophy, 
  User, 
  Lock, 
  Unlock, 
  Key, 
  Settings, 
  LogOut, 
  MessageCircle, 
  CheckCircle2, 
  Calendar, 
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
  ChevronRight,
  Activity,
  DollarSign,
  Users
} from 'lucide-react';
import Link from 'next/link';

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  homeScoreReal: number | null;
  awayScoreReal: number | null;
  status: 'PENDING' | 'PLAYED';
}

interface Phase {
  id: string;
  name: string;
  openAt: string;
  closeAt: string;
  status: 'LOCKED' | 'OPEN' | 'CLOSED';
  matches: Match[];
}

interface Prediction {
  matchId: string;
  homeScorePredicted: number;
  awayScorePredicted: number;
  points: number | null;
}

interface RankingUser {
  id: string;
  name: string;
  points: number;
  predictionsCount: number;
}

export default function Home() {
  // Auth state
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: 'USER' | 'ADMIN'; status: 'ACTIVE' | 'INACTIVE' } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App data state
  const [phases, setPhases] = useState<Phase[]>([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [userPhaseStatuses, setUserPhaseStatuses] = useState<{ phaseId: string; status: 'ACTIVE' | 'INACTIVE' }[]>([]);

  // Predictions local inputs (keyed by matchId)
  const [localPredictions, setLocalPredictions] = useState<Record<string, { home: string; away: string }>>({});

  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Change Password state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [finalPrize, setFinalPrize] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_final_prize') || '0';
    }
    return '0';
  });

  const calculatedTargetGoal = adminStats 
    ? (adminStats.totalPhases - 1) * 100 + (Number(finalPrize) || 0)
    : 0;

  const calculatedProfit = adminStats
    ? adminStats.totalRevenue - calculatedTargetGoal
    : 0;

  // Comparison (Cara a Cara) states
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);

  const fetchComparison = async (otherUserId: string) => {
    if (!user || user.role === 'ADMIN') return;
    setComparisonLoading(true);
    setShowComparisonModal(true);
    try {
      const res = await fetch(`/api/predictions/comparison?otherUserId=${otherUserId}`);
      if (res.ok) {
        const data = await res.json();
        setComparisonData(data);
      } else {
        toast.error('No se pudo cargar la comparación.');
        setShowComparisonModal(false);
      }
    } catch (e) {
      toast.error('Error al conectar con el servidor.');
      setShowComparisonModal(false);
    } finally {
      setComparisonLoading(false);
    }
  };

  // Profile Stats states
  const [profileStats, setProfileStats] = useState<any>(null);
  const [loadingProfileStats, setLoadingProfileStats] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  const fetchProfileStats = async () => {
    setLoadingProfileStats(true);
    try {
      const res = await fetch('/api/profile/stats');
      if (res.ok) {
        const data = await res.json();
        setProfileStats(data);
      }
    } catch (e) {
      console.error('Error fetching profile stats:', e);
    } finally {
      setLoadingProfileStats(false);
    }
  };

  // Simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedScores, setSimulatedScores] = useState<Record<string, { home: string; away: string }>>({});
  const [simulatedRanking, setSimulatedRanking] = useState<RankingUser[]>([]);

  const handleSimulateScoreChange = (matchId: string, team: 'home' | 'away', val: string) => {
    if (val !== '' && !/^\d+$/.test(val)) return;
    setSimulatedScores(prev => {
      const current = prev[matchId] || { home: '', away: '' };
      const next = {
        ...prev,
        [matchId]: {
          ...current,
          [team]: val
        }
      };
      
      triggerSimulation(next);
      return next;
    });
  };

  const triggerSimulation = async (currentSims: Record<string, { home: string; away: string }>) => {
    const simsPayload = Object.entries(currentSims).map(([matchId, scores]) => ({
      matchId,
      homeScore: scores.home,
      awayScore: scores.away
    }));

    try {
      const res = await fetch('/api/ranking/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          simulations: simsPayload,
          phaseId: selectedPhaseId
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSimulatedRanking(data.ranking);
      }
    } catch (e) {
      console.error('Simulation error:', e);
    }
  };

  const startSimulation = () => {
    setIsSimulating(true);
    const initSims: Record<string, { home: string; away: string }> = {};
    phases.forEach(p => {
      p.matches.forEach(m => {
        if (m.status === 'PENDING') {
          initSims[m.id] = { home: '', away: '' };
        }
      });
    });
    setSimulatedScores(initSims);
    setSimulatedRanking([...ranking]);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    setSimulatedScores({});
    setSimulatedRanking([]);
  };

  const fetchAdminStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setAdminStats(data);
      }
    } catch (e) {
      console.error('Error fetching admin stats:', e);
    }
  };
  const [pendingSaveAfterAuth, setPendingSaveAfterAuth] = useState(false);

  // WhatsApp active status modal
  const [showInactiveModal, setShowInactiveModal] = useState(false);

  // View toggle for mobile (Matches vs Ranking)
  const [mobileTab, setMobileTab] = useState<'matches' | 'ranking'>('matches');

  // Load user session
  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        if (data.user.role === 'ADMIN') {
          fetchAdminStats();
        } else if (data.user.role === 'USER' && data.user.status === 'ACTIVE') {
          fetchProfileStats();
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  // Load phases and user predictions
  const fetchPhasesAndPredictions = async () => {
    setDataLoading(true);
    try {
      const res = await fetch('/api/phases');
      const data = await res.json();
      if (data.phases) {
        setPhases(data.phases);
        if (data.phases.length > 0 && !selectedPhaseId) {
          // Find first open phase, or default to first phase
          const openPhase = data.phases.find((p: Phase) => p.status === 'OPEN');
          setSelectedPhaseId(openPhase ? openPhase.id : data.phases[0].id);
        }

        // Initialize local predictions from user's saved predictions
        const savedPreds: Record<string, { home: string; away: string }> = {};
        data.predictions?.forEach((pred: Prediction) => {
          savedPreds[pred.matchId] = {
            home: pred.homeScorePredicted.toString(),
            away: pred.awayScorePredicted.toString(),
          };
        });
        setLocalPredictions(prev => ({ ...prev, ...savedPreds }));
        if (data.phaseStatuses) {
          setUserPhaseStatuses(data.phaseStatuses);
        }
      }
    } catch (error) {
      toast.error('Error al cargar partidos y predicciones.');
      console.error(error);
    } finally {
      setDataLoading(false);
    }
  };

  // Load ranking (defaults to selected phase ranking)
  const fetchRanking = async (phaseId = selectedPhaseId) => {
    try {
      const url = phaseId ? `/api/ranking?phaseId=${phaseId}` : '/api/ranking';
      const res = await fetch(url);
      const data = await res.json();
      if (data.ranking) {
        setRanking(data.ranking);
      }
    } catch (error) {
      console.error('Error fetching ranking:', error);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchPhasesAndPredictions();
  }, []);

  // Update ranking when active phase changes
  useEffect(() => {
    if (selectedPhaseId) {
      fetchRanking(selectedPhaseId);
    }
  }, [selectedPhaseId]);

  // Sync auth mode from query parameters if redirected
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('auth_mode') === 'login') {
        setAuthMode('login');
        setShowAuthModal(true);
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        setUser(null);
        setProfileStats(null);
        toast.success('Sesión cerrada correctamente.');
        // Refresh predictions
        fetchPhasesAndPredictions();
      }
    } catch (error) {
      toast.error('Error al cerrar sesión.');
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Ocurrió un error.');
      } else {
        toast.success(authMode === 'login' ? '¡Bienvenido de nuevo!' : '¡Registro completado!');
        setUser(data.user);
        if (data.user.role === 'ADMIN') {
          fetchAdminStats();
        } else if (data.user.role === 'USER' && data.user.status === 'ACTIVE') {
          fetchProfileStats();
        }
        setShowAuthModal(false);
        setAuthForm({ name: '', email: '', password: '' });
        
        // Refresh ranking & predictions
        fetchRanking();
        await fetchPhasesAndPredictions();

        // Continue saving flow if user triggered save
        if (pendingSaveAfterAuth) {
          setPendingSaveAfterAuth(false);
          if (data.user.status === 'ACTIVE') {
            await savePredictions(data.user);
          } else {
            setShowInactiveModal(true);
          }
        }
      }
    } catch (error) {
      toast.error('Error en el servidor.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changePasswordForm.newPassword !== changePasswordForm.confirmNewPassword) {
      toast.error('Las nuevas contraseñas no coinciden.');
      return;
    }
    if (changePasswordForm.newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setChangingPassword(true);
    const saveToast = toast.loading('Cambiando contraseña...');

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: changePasswordForm.currentPassword,
          newPassword: changePasswordForm.newPassword,
        }),
      });

      const data = await res.json();
      toast.dismiss(saveToast);

      if (!res.ok) {
        toast.error(data.error || 'No se pudo cambiar la contraseña.');
      } else {
        toast.success('¡Contraseña cambiada con éxito!');
        setShowChangePasswordModal(false);
        setChangePasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      }
    } catch (error) {
      toast.dismiss(saveToast);
      toast.error('Error al conectar con el servidor.');
    } finally {
      setChangingPassword(false);
    }
  };

  const updatePredictionInput = (matchId: string, team: 'home' | 'away', val: string) => {
    if (val !== '' && !/^\d+$/.test(val)) return;
    
    setLocalPredictions(prev => {
      const current = prev[matchId] || { home: '', away: '' };
      return {
        ...prev,
        [matchId]: {
          ...current,
          [team]: val
        }
      };
    });
  };

  const savePredictions = async (currentUser = user) => {
    if (!currentUser) {
      setPendingSaveAfterAuth(true);
      setAuthMode('login');
      setShowAuthModal(true);
      toast('Inicia sesión para guardar tus pronósticos', { icon: '🔑' });
      return;
    }

    if (currentUser.status === 'INACTIVE') {
      setShowInactiveModal(true);
      return;
    }

    const currentPhase = phases.find(p => p.id === selectedPhaseId);
    if (!currentPhase) return;

    const currentPhaseStatus = userPhaseStatuses.find(ps => ps.phaseId === selectedPhaseId);
    const isCurrentPhasePaid = currentUser.role === 'ADMIN' || (currentPhaseStatus && currentPhaseStatus.status === 'ACTIVE');

    if (!isCurrentPhasePaid) {
      setShowInactiveModal(true);
      return;
    }

    if (currentPhase.status !== 'OPEN') {
      toast.error('Esta fase está bloqueada o ya cerró.');
      return;
    }

    // Build payload only for matches in the CURRENT phase that have inputs, are pending, and have not started yet
    const now = new Date();
    const payload = currentPhase.matches
      .map(m => {
        const pred = localPredictions[m.id];
        const hasStarted = now > new Date(m.matchDate);
        if (pred && pred.home !== '' && pred.away !== '' && m.status === 'PENDING' && !hasStarted) {
          return {
            matchId: m.id,
            homeScorePredicted: parseInt(pred.home, 10),
            awayScorePredicted: parseInt(pred.away, 10)
          };
        }
        return null;
      })
      .filter(Boolean);

    if (payload.length === 0) {
      toast.error('No hay pronósticos nuevos o modificables para guardar (los partidos ya iniciaron o no ingresaste marcadores).');
      return;
    }

    const saveToast = toast.loading('Guardando pronósticos...');

    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictions: payload }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.dismiss(saveToast);
        toast.error(data.error || 'No se pudieron guardar los pronósticos.');
      } else {
        toast.dismiss(saveToast);
        toast.success(`¡Pronósticos guardados! (${data.count === 1 ? '1 partido' : `${data.count} partidos`})`);
        fetchPhasesAndPredictions();
        fetchRanking();
      }
    } catch (error) {
      toast.dismiss(saveToast);
      toast.error('Error al conectar con el servidor.');
    }
  };

  const getPointsPillColor = (pts: number | null) => {
    if (pts === null) return 'bg-gray-800/80 text-gray-400';
    if (pts === 3) return 'bg-gold/20 text-gold border border-gold/40 glow-gold';
    if (pts === 1) return 'bg-accent/20 text-accent border border-accent/40 glow-green';
    return 'bg-red-500/10 text-red-400 border border-red-500/20';
  };

  const activePhase = phases.find(p => p.id === selectedPhaseId);
  const currentPhaseStatus = user ? userPhaseStatuses.find(ps => ps.phaseId === selectedPhaseId) : null;
  const isCurrentPhasePaid = user ? (user.role === 'ADMIN' || (currentPhaseStatus && currentPhaseStatus.status === 'ACTIVE')) : false;

  return (
    <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Navbar Header */}
      <header className="flex flex-col sm:flex-row justify-between items-center py-5 border-b border-card-border mb-8 gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="bg-card p-1.5 rounded-xl border border-card-border shadow-sm shrink-0">
            <img src="/geourp.png" alt="Logo GEO-URP" className="h-10 w-10 object-contain rounded-lg" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-foreground via-accent to-gold bg-clip-text text-transparent font-title">
              POLLA MUNDIALISTA
            </h1>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-[10px] text-accent font-extrabold tracking-wider uppercase font-title">
                Mundial 2026
              </span>
              <span className="text-[10px] text-gray-500">•</span>
              <span className="text-[10px] text-gray-400 font-medium">
                Organizado por <a href="https://geourp.org/" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline font-bold">GEO-URP</a>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {authLoading ? (
            <div className="h-8 w-24 bg-card-border/50 animate-pulse rounded-lg" />
          ) : user ? (
            <div className="flex items-center space-x-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                user.status === 'ACTIVE' 
                  ? 'bg-accent/15 text-accent border border-accent/30' 
                  : 'bg-gold/15 text-gold border border-gold/30 animate-pulse'
              }`}>
                {user.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
              </span>
              
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <span className="hidden md:inline font-semibold mr-1">{user.name}</span>
                <button onClick={() => setShowRulesModal(true)} className="flex items-center space-x-1.5 px-2.5 py-1.5 hover:bg-accent/10 text-accent rounded-lg transition-colors border border-accent/20 text-xs font-bold font-title" title="Reglas y Cómo Jugar">
                  <Trophy className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reglas</span>
                </button>
                {user.role === 'ADMIN' && (
                  <Link href="/admin" className="p-2 hover:bg-accent/10 text-accent rounded-lg transition-colors border border-accent/20 shadow-sm" title="Panel Admin">
                    <Settings className="h-4 w-4" />
                  </Link>
                )}
                <button onClick={() => setShowChangePasswordModal(true)} className="p-2 hover:bg-accent/10 text-accent rounded-lg transition-colors border border-card-border" title="Cambiar Contraseña">
                  <Key className="h-4 w-4" />
                </button>
                <button onClick={handleLogout} className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors border border-red-500/15" title="Cerrar sesión">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex space-x-2 font-title">
              <button 
                onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                className="px-4 py-1.5 text-sm font-semibold text-accent hover:text-accent/90 hover:bg-accent/10 rounded-lg transition-all"
              >
                Entrar
              </button>
              <button 
                onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
                className="px-4 py-1.5 text-sm font-bold bg-accent hover:bg-accent/90 text-background rounded-lg shadow-md shadow-accent/10 hover:shadow-accent/20 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Registrarme
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Hero / Landing Section for non-logged-in visitors */}
      {!user && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-card-border mb-8 bg-gradient-to-br from-primary/10 via-background to-[#020a06] relative overflow-hidden">
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative">
            <div className="flex-1 space-y-4 text-left">
              <div className="inline-flex items-center space-x-2 bg-accent/10 border border-accent/20 px-3 py-1 rounded-full text-accent font-title font-extrabold uppercase tracking-wider text-[10px]">
                <span>🏆 POLLA OFICIAL MUNDIAL 2026</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-100 font-title uppercase tracking-tight leading-none">
                ¿Demuestra tus conocimientos futbolísticos y gana grandes premios?
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-sans max-w-2xl">
                La <strong className="text-accent font-bold">Polla Mundialista GEO-URP</strong> es la plataforma oficial organizada por <strong className="text-gold font-bold">GEO-URP</strong> para pronosticar los marcadores de la máxima fiesta del fútbol. Registra tus marcadores, acumula puntos y sigue el ranking en tiempo real en cada fase del torneo.
              </p>
              
              <div className="flex flex-wrap gap-3 font-title pt-2">
                <button
                  onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
                  className="px-5 py-2.5 bg-accent hover:bg-accent/90 text-background font-black rounded-xl shadow-lg shadow-accent/15 transform hover:-translate-y-0.5 transition-all text-xs uppercase tracking-wider"
                >
                  Crear Cuenta y Participar
                </button>
              </div>
            </div>
            
            {/* Visual element on the right */}
            <div className="w-28 h-28 sm:w-36 sm:h-36 shrink-0 bg-card p-3 rounded-3xl border border-card-border/80 shadow-2xl flex items-center justify-center relative group">
              <div className="absolute inset-0 bg-accent/5 rounded-3xl blur group-hover:bg-accent/10 transition-all pointer-events-none" />
              <img src="/geourp.png" alt="GEO-URP Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(111,159,58,0.25)] transition-transform duration-300 group-hover:scale-105" />
            </div>
          </div>
        </div>
      )}

      {/* Explanatory Features Grid for non-logged-in visitors */}
      {!user && (
        <section id="como-funciona" className="glass-panel p-6 sm:p-8 rounded-3xl border border-card-border mb-8 bg-[#04110a] relative overflow-hidden font-sans">
          <div className="absolute top-0 left-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-8">
            <span className="text-[10px] text-accent font-extrabold uppercase tracking-wider font-title bg-accent/10 px-2.5 py-1 rounded border border-accent/20">Guía del Participante</span>
            <h3 className="text-xl sm:text-2xl font-black text-gray-100 font-title uppercase tracking-tight">¿CÓMO FUNCIONA LA POLLA?</h3>
            <p className="text-xs text-gray-400">Todo lo que necesitas saber sobre las reglas, los premios y la organización.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Reglas */}
            <div className="bg-background/40 border border-card-border/50 p-5 rounded-2xl flex flex-col justify-between hover:border-accent/30 transition-colors">
              <div className="space-y-4">
                <div className="w-10 h-10 bg-accent/10 border border-accent/20 text-accent rounded-xl flex items-center justify-center font-title font-black text-base shadow-sm shrink-0">
                  1
                </div>
                <h4 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-title flex items-center space-x-1.5">
                  <Trophy className="h-4 w-4 text-accent" />
                  <span>Reglas y Puntajes</span>
                </h4>
                <ul className="text-xs text-gray-400 space-y-2.5 leading-relaxed font-sans">
                  <li className="flex items-start space-x-2">
                    <span className="text-accent font-bold mt-0.5">✔</span>
                    <span><strong className="text-gray-300">Marcador Exacto:</strong> Recibes <strong className="text-accent">3 puntos</strong> si aciertas la cantidad exacta de goles de ambos equipos.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-accent font-bold mt-0.5">✔</span>
                    <span><strong className="text-gray-300">Resultado Simple:</strong> Recibes <strong className="text-accent">1 punto</strong> si aciertas quién gana (o el empate) pero no el score exacto.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-red-400 font-bold mt-0.5">✘</span>
                    <span><strong className="text-gray-300">Incorrecto:</strong> Obtienes 0 puntos si no aciertas el resultado básico del encuentro.</span>
                  </li>
                  <li className="flex items-start space-x-2 bg-[#020906]/60 p-2 rounded-lg border border-card-border/20 mt-1">
                    <span className="text-gold font-bold">⏱</span>
                    <span><strong className="text-gray-300">Límite por partido:</strong> Puedes registrar o editar tu pronóstico hasta justo antes del silbatazo inicial de cada encuentro.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 2: Pago */}
            <div className="bg-background/40 border border-card-border/50 p-5 rounded-2xl flex flex-col justify-between hover:border-gold/30 transition-colors">
              <div className="space-y-4">
                <div className="w-10 h-10 bg-gold/10 border border-gold/20 text-gold rounded-xl flex items-center justify-center font-title font-black text-base shadow-sm shrink-0">
                  2
                </div>
                <h4 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-title flex items-center space-x-1.5">
                  <DollarSign className="h-4 w-4 text-gold" />
                  <span>Inscripción y Premios</span>
                </h4>
                <ul className="text-xs text-gray-400 space-y-2.5 leading-relaxed font-sans">
                  <li className="flex items-start space-x-2">
                    <span className="text-gold font-bold mt-0.5">💰</span>
                    <span><strong className="text-gray-300">Costo por fase:</strong> Cada fase del torneo requiere una inscripción independiente de <strong className="text-gold">S/ 10.00 soles</strong>.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-gold font-bold mt-0.5">🏆</span>
                    <span><strong className="text-gray-300">Premio por Fase:</strong> Se otorga un premio único de <strong className="text-accent">100 soles</strong> para el 1er lugar de cada fase. Si dos o más personas empatan en el primer puesto, el premio se divide equitativamente.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-gold font-bold mt-0.5">📲</span>
                    <span><strong className="text-gray-300">Activación Fácil:</strong> Envías el comprobante de pago por WhatsApp y el administrador habilitará de inmediato la fase en tu cuenta.</span>
                  </li>
                  <li className="flex items-start space-x-2 bg-[#020906]/60 p-2 rounded-lg border border-card-border/20 mt-1">
                    <span className="text-accent font-bold">✨</span>
                    <span><strong className="text-gray-300">Premio por fase:</strong> El ranking y premio se calculan independientemente por fase para que todos tengan chances de ganar.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 3: GeoURP */}
            <div className="bg-background/40 border border-card-border/50 p-5 rounded-2xl flex flex-col justify-between hover:border-accent/30 transition-colors">
              <div className="space-y-4">
                <div className="w-10 h-10 bg-accent/10 border border-accent/20 text-accent rounded-xl flex items-center justify-center font-title font-black text-base shadow-sm shrink-0">
                  3
                </div>
                <h4 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-title flex items-center space-x-1.5">
                  <Users className="h-4 w-4 text-accent" />
                  <span>Organizado por GeoURP</span>
                </h4>
                <ul className="text-xs text-gray-400 space-y-2.5 leading-relaxed font-sans">
                  <li className="flex items-start space-x-2">
                    <span className="text-accent font-bold mt-0.5">🤝</span>
                    <span><strong className="text-gray-300">Respaldo Oficial:</strong> Evento organizado y administrado por el equipo oficial de <a href="https://geourp.org/" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline font-bold">GEO-URP</a>.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-accent font-bold mt-0.5">👥</span>
                    <span><strong className="text-gray-300">Cara a Cara:</strong> Podrás comparar tus pronósticos detalladamente con cualquier rival en tiempo real tras iniciados los encuentros.</span>
                  </li>
                  <li className="flex items-start space-x-2 bg-[#020906]/60 p-2 rounded-lg border border-card-border/20 mt-1">
                    <span className="text-gold font-bold">🔮</span>
                    <span><strong className="text-gray-300">Simulador Integrado:</strong> Calcula posibles escenarios con marcadores de simulación y mira cómo variará la tabla de posiciones.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Layout Grid */}
      {user && (
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Toggle on mobile */}
        <div className="lg:hidden flex space-x-2 border-b border-card-border pb-4 font-title">
          <button
            onClick={() => setMobileTab('matches')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-all ${
              mobileTab === 'matches'
                ? 'bg-accent/10 border-accent/40 text-accent'
                : 'border-transparent text-gray-400'
            }`}
          >
            Pronósticos
          </button>
          <button
            onClick={() => setMobileTab('ranking')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-all ${
              mobileTab === 'ranking'
                ? 'bg-accent/10 border-accent/40 text-accent'
                : 'border-transparent text-gray-400'
            }`}
          >
            Ranking General
          </button>
        </div>

        {/* Column 1 & 2: Match predictions / Admin Dashboard */}
        <section className={`lg:col-span-2 space-y-6 ${mobileTab === 'matches' ? 'block' : 'hidden lg:block'}`}>
          {user?.role === 'ADMIN' ? (
            <div className="space-y-6">
              {/* Premium Dashboard Header */}
              <div className="glass-panel p-6 rounded-3xl border border-card-border bg-gradient-to-br from-primary/10 via-background to-background relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
                <h3 className="text-xl font-black text-gray-100 flex items-center space-x-2 font-title tracking-tight">
                  <Trophy className="h-6 w-6 text-accent glow-green animate-bounce" />
                  <span>PANEL DE ADMINISTRACIÓN</span>
                </h3>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Bienvenido, administrador. A continuación se presentan las estadísticas financieras e ingresos acumulados en tiempo real por el registro de participantes en la plataforma.
                </p>
                <div className="mt-4 flex space-x-2 font-title">
                  <Link
                    href="/admin"
                    className="inline-flex items-center space-x-2 text-xs font-bold text-background bg-accent hover:bg-accent/90 px-4 py-2.5 rounded-xl transition-all shadow-md shadow-accent/10"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Ir a Gestión del Sistema (Fases/Partidos)</span>
                  </Link>
                </div>
              </div>

              {/* Financial Stats Grid */}
              {adminStats ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-title">
                  {/* Card 1: Recaudado */}
                  <div className="glass-card p-5 rounded-2xl border border-card-border flex flex-col justify-between relative overflow-hidden bg-primary/10">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Recaudado</span>
                      <span className="text-3xl font-black text-accent mt-2 block">
                        {adminStats.totalRevenue} Soles
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-4 border-t border-card-border/30 pt-2 flex justify-between font-sans">
                      <span>Costo por fase: 10 Soles</span>
                      <span className="font-bold text-accent">{adminStats.activeInscriptions} Inscripciones</span>
                    </div>
                  </div>

                  {/* Card 2: Meta */}
                  <div className="glass-card p-5 rounded-2xl border border-card-border flex flex-col justify-between relative overflow-hidden bg-background">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Meta Premio Primer Lugar</span>
                      <span className="text-3xl font-black text-gold mt-2 block font-title">
                        {calculatedTargetGoal} Soles
                      </span>

                      {/* Final Prize Input */}
                      <div className="mt-3.5 flex items-center space-x-1.5 bg-[#020906] p-1.5 rounded-xl border border-card-border/60 max-w-[140px]">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider pl-1">Final:</span>
                        <span className="text-[10px] text-gold font-bold">S/</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={finalPrize}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val !== '' && !/^\d+$/.test(val)) return;
                            setFinalPrize(val);
                            localStorage.setItem('admin_final_prize', val || '0');
                          }}
                          placeholder="0"
                          className="w-12 bg-card border border-card-border rounded px-1 py-0.5 text-xs font-black text-accent text-center focus:outline-none focus:border-accent font-title"
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-4 border-t border-card-border/30 pt-2 font-sans flex justify-between">
                      <span>Restantes (S/100 c/u)</span>
                      <span className="font-bold text-gold">{adminStats.totalPhases - 1} Fases + Final</span>
                    </div>
                  </div>

                  {/* Card 3: Ganancia */}
                  <div className="glass-card p-5 rounded-2xl border border-card-border flex flex-col justify-between relative overflow-hidden bg-background">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Utilidad / Ganancia</span>
                      <span className={`text-3xl font-black mt-2 block font-title ${calculatedProfit >= 0 ? 'text-accent' : 'text-red-400'}`}>
                        {calculatedProfit} Soles
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-4 border-t border-card-border/30 pt-2 font-sans">
                      <span>{calculatedProfit >= 0 ? 'Excedente acumulado' : 'Pendiente para cubrir meta'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="h-28 bg-card-border/30 animate-pulse rounded-2xl" />
                  ))}
                </div>
              )}

              {/* General App Stats */}
              {adminStats && (
                <div className="glass-panel p-6 rounded-3xl border border-card-border space-y-4">
                  <h4 className="text-sm font-bold text-gray-200 font-title">Métricas Generales</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-title">
                    <div className="bg-background/40 p-3 rounded-xl border border-card-border/50 text-center">
                      <span className="text-lg font-black text-gray-200 block">{adminStats.totalUsers}</span>
                      <span className="text-[10px] text-gray-400 font-sans">Total Usuarios</span>
                    </div>
                    <div className="bg-background/40 p-3 rounded-xl border border-card-border/50 text-center">
                      <span className="text-lg font-black text-accent block">{adminStats.activeUsers}</span>
                      <span className="text-[10px] text-gray-400 font-sans">Usuarios Activos</span>
                    </div>
                    <div className="bg-background/40 p-3 rounded-xl border border-card-border/50 text-center">
                      <span className="text-lg font-black text-red-400 block">{adminStats.inactiveUsers}</span>
                      <span className="text-[10px] text-gray-400 font-sans">Pendientes Activación</span>
                    </div>
                    <div className="bg-background/40 p-3 rounded-xl border border-card-border/50 text-center">
                      <span className="text-lg font-black text-blue-400 block">{adminStats.totalPredictions}</span>
                      <span className="text-[10px] text-gray-400 font-sans">Pronósticos Guardados</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Dashboard Estadístico Personal */}
              {user && user.role === 'USER' && user.status === 'ACTIVE' && profileStats && (
                <div className="glass-panel p-6 rounded-3xl border border-card-border mb-6 space-y-6">
                  <h3 className="text-sm font-black text-gray-100 font-title flex items-center space-x-2">
                    <Activity className="h-4.5 w-4.5 text-accent" />
                    <span>MI RENDIMIENTO & ESTADÍSTICAS</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Precision Progress Bars */}
                    <div className="col-span-1 space-y-4">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-title">Precisión de Pronósticos</h4>
                      <div className="bg-background/30 border border-card-border/40 p-4 rounded-2xl space-y-3 font-sans">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-300 font-medium font-sans">Exacto (+3 pts)</span>
                          <span className="text-accent font-bold">{profileStats.accuracy.exact} ({profileStats.accuracy.exactPercent}%)</span>
                        </div>
                        <div className="w-full bg-[#020906] h-2 rounded-full overflow-hidden border border-card-border/20">
                          <div className="bg-accent h-full rounded-full transition-all duration-500" style={{ width: `${profileStats.accuracy.exactPercent}%` }} />
                        </div>

                        <div className="flex justify-between items-center text-xs pt-1">
                          <span className="text-gray-300 font-medium font-sans">Ganador/Empate (+1 pt)</span>
                          <span className="text-gold font-bold">{profileStats.accuracy.outcome} ({profileStats.accuracy.outcomePercent}%)</span>
                        </div>
                        <div className="w-full bg-[#020906] h-2 rounded-full overflow-hidden border border-card-border/20">
                          <div className="bg-gold h-full rounded-full transition-all duration-500" style={{ width: `${profileStats.accuracy.outcomePercent}%` }} />
                        </div>

                        <div className="flex justify-between items-center text-xs pt-1">
                          <span className="text-gray-300 font-medium font-sans">Incorrectos (0 pts)</span>
                          <span className="text-red-400 font-bold">{profileStats.accuracy.missed} ({profileStats.accuracy.missedPercent}%)</span>
                        </div>
                        <div className="w-full bg-[#020906] h-2 rounded-full overflow-hidden border border-card-border/20">
                          <div className="bg-red-500/60 h-full rounded-full transition-all duration-500" style={{ width: `${profileStats.accuracy.missedPercent}%` }} />
                        </div>
                        <div className="text-[9px] text-gray-500 font-semibold text-center pt-2">
                          Basado en {profileStats.accuracy.totalPlayed} partido(s) finalizados.
                        </div>
                      </div>
                    </div>
                    
                    {/* Ranking Evolution SVG Line Chart */}
                    <div className="col-span-1 md:col-span-2 space-y-4">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-title">Evolución en el Ranking (Puesto)</h4>
                      <div className="bg-background/30 border border-card-border/40 p-4 rounded-2xl h-[135px] flex items-center justify-center relative">
                        {profileStats.evolution && profileStats.evolution.length > 0 ? (
                          (() => {
                            const evo = profileStats.evolution;
                            const width = 450;
                            const height = 100;
                            const paddingX = 45;
                            const paddingY = 15;
                            
                            const ranks = evo.map((e: any) => e.rank);
                            const maxRank = Math.max(...ranks, 10);
                            const minRank = 1;
                            
                            const points = evo.map((e: any, idx: number) => {
                              const x = paddingX + (idx * (width - 2 * paddingX)) / Math.max(evo.length - 1, 1);
                              const y = paddingY + ((e.rank - minRank) * (height - 2 * paddingY)) / Math.max(maxRank - minRank, 1);
                              return { x, y, ...e };
                            });
                            
                            const pathD = points.map((p: any, idx: number) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                            const areaD = points.length > 0 ? `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z` : '';
                            
                            return (
                              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full font-sans select-none">
                                <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
                                <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
                                
                                <defs>
                                  <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6F9F3A" stopOpacity="0.25" />
                                    <stop offset="100%" stopColor="#6F9F3A" stopOpacity="0.0" />
                                  </linearGradient>
                                </defs>
                                
                                {areaD && <path d={areaD} fill="url(#chart-glow)" />}
                                
                                <path d={pathD} fill="none" stroke="#6F9F3A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="glow-accent" />
                                
                                {points.map((p: any, idx: number) => (
                                  <g key={idx}>
                                    <circle cx={p.x} cy={p.y} r="3.5" fill="#030c08" stroke="#6F9F3A" strokeWidth="2" />
                                    <text x={p.x} y={p.y - 7} fill="#fff" fontSize="8" fontWeight="bold" textAnchor="middle">
                                      #{p.rank}
                                    </text>
                                    <text x={p.x} y={height - 2} fill="#6b7280" fontSize="8" fontWeight="bold" textAnchor="middle">
                                      {p.phaseName.replace('Ronda de ', 'R')}
                                    </text>
                                  </g>
                                ))}
                              </svg>
                            );
                          })()
                        ) : (
                          <span className="text-xs text-gray-500">Aún no hay fases cerradas para calcular evolución.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Status Alert for Unpaid/Inactive Phase */}
              {user && !isCurrentPhasePaid && (
                <div className="p-4 bg-gradient-to-r from-gold/10 via-gold/5 to-transparent border border-gold/30 rounded-2xl flex items-start space-x-3 shadow-lg shadow-gold/5">
                  <AlertTriangle className="h-5 w-5 text-gold shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-gold font-title">Fase Pendiente de Inscripción</h4>
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                      Cada fase requiere su inscripción independiente para poder guardar pronósticos. 
                      El costo es de <span className="font-bold text-gold">10 soles</span> por fase y asegura el <span className="font-bold text-accent">premio de 100 soles al primer lugar</span> (para una o más personas que compartan el puesto).
                      Por favor, envía tu pago de 10 soles por WhatsApp para desbloquear la fase <strong>{activePhase?.name}</strong>.
                    </p>
                    <a 
                      href={`https://wa.me/51999999999?text=Hola%20Admin,%20he%20realizado%20mi%20pago%20de%2010%20soles%20para%20la%20fase%20${encodeURIComponent(activePhase?.name || '')}.%20Activa%20mi%20participación.`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="mt-3.5 inline-flex items-center space-x-2 text-xs font-black text-[#030c08] bg-[#25D366] hover:bg-[#20ba5a] px-4 py-2.5 rounded-xl transition-all shadow-md shadow-[#25D366]/10 hover:shadow-[#25D366]/20 font-title uppercase tracking-wider"
                    >
                      <MessageCircle className="h-4 w-4 fill-current" />
                      <span>Enviar Pago por WhatsApp</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Phases selector pills */}
              <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
                {dataLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <div key={i} className="h-10 w-28 bg-card-border/50 animate-pulse rounded-full shrink-0" />
                  ))
                ) : (
                  phases.map((phase) => (
                    <button
                      key={phase.id}
                      onClick={() => setSelectedPhaseId(phase.id)}
                      className={`px-4 py-2 text-xs font-bold rounded-full border transition-all shrink-0 uppercase tracking-wider font-title ${
                        selectedPhaseId === phase.id
                          ? 'bg-accent text-background border-accent shadow-md shadow-accent/15'
                          : 'bg-card border-card-border text-gray-400 hover:border-gray-600 hover:text-gray-200'
                      }`}
                    >
                      {phase.name}
                      {phase.status === 'OPEN' && (
                        <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-background animate-ping" />
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Selected Phase Info */}
              {activePhase && (
                <div className="glass-panel p-5 rounded-2xl border border-card-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-100 flex items-center space-x-2 font-title">
                      <span>{activePhase.name}</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        activePhase.status === 'OPEN' 
                          ? 'bg-accent/10 text-accent border border-accent/20' 
                          : activePhase.status === 'CLOSED'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}>
                        {activePhase.status === 'OPEN' ? 'Abierta' : activePhase.status === 'CLOSED' ? 'Cerrada' : 'Bloqueada'}
                      </span>
                    </h3>
                  </div>

                  <div className="flex flex-wrap md:flex-nowrap gap-2 items-center w-full md:w-auto">
                    {/* Simulator Trigger */}
                    {activePhase.matches.some(m => m.status === 'PENDING') && (
                      <button
                        onClick={isSimulating ? stopSimulation : startSimulation}
                        className={`px-4 py-2.5 rounded-xl font-bold border transition-all text-xs font-title uppercase tracking-wider flex items-center space-x-1.5 ${
                          isSimulating 
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30' 
                            : 'bg-background hover:bg-card-border/40 text-gray-300 border-card-border hover:border-gray-500'
                        }`}
                      >
                        <Activity className="h-4 w-4 text-amber-500" />
                        <span>{isSimulating ? 'Detener Simulador' : 'Simular Marcadores'}</span>
                      </button>
                    )}

                    {activePhase.status === 'OPEN' && !isSimulating && (
                      <button
                        onClick={() => savePredictions()}
                        className="px-6 py-2.5 bg-gradient-to-r from-accent to-[#5c8a2d] hover:from-[#5c8a2d] hover:to-accent text-background font-black rounded-xl shadow-lg shadow-accent/10 hover:shadow-accent/20 transform hover:-translate-y-0.5 transition-all duration-200 font-title uppercase tracking-wider text-xs"
                      >
                        Guardar Pronósticos
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Simulation Banner */}
              {isSimulating && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between text-xs text-amber-300 font-sans shadow-md">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                    <span>
                      <strong>Modo Simulación Activo:</strong> Escribe marcadores hipotéticos en los campos de <strong>"Simular"</strong> en los partidos de abajo para recalcular el ranking.
                    </span>
                  </div>
                  <button 
                    onClick={stopSimulation} 
                    className="font-bold underline uppercase tracking-wider text-[10px] font-title px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/25"
                  >
                    Salir
                  </button>
                </div>
              )}

              {/* Match cards */}
              <div className="space-y-4 font-sans">
                {dataLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="h-32 bg-card-border/30 animate-pulse rounded-2xl" />
                  ))
                ) : activePhase?.name.toLowerCase() === 'final' ? (
                  <div className="glass-panel p-12 rounded-3xl text-center border border-card-border/80 flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-gold/10 border border-gold/30 rounded-full flex items-center justify-center text-gold animate-pulse">
                      <Lock className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-black text-gray-100 font-title uppercase tracking-tight">Fase Bloqueada</h3>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                      La gran **Final** se encuentra bloqueada por el momento. Se habilitará cuando se definan las condiciones y premios.
                    </p>
                  </div>
                ) : activePhase?.matches.length === 0 ? (
                  <div className="glass-panel p-8 rounded-2xl text-center border border-card-border">
                    <Info className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No hay partidos asignados a esta fase aún.</p>
                  </div>
                ) : (
                  activePhase?.matches.map((match) => {
                    const pred = localPredictions[match.id] || { home: '', away: '' };
                    
                    const isMatchClosed = activePhase.status !== 'OPEN' || match.status === 'PLAYED' || new Date() > new Date(match.matchDate);

                    return (
                      <div key={match.id} className="glass-card p-5 rounded-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 hover:translate-x-1 transition-all duration-200">
                        {/* Decorative background visual */}
                        <div className="absolute -top-6 -left-6 w-12 h-12 rounded-full border border-accent/5 pointer-events-none" />
                        
                        {/* Team 1 vs Team 2 (Left ticket body) */}
                        <div className="flex-1 grid grid-cols-7 items-center gap-2 md:border-r md:border-dashed md:border-card-border/50 md:pr-6">
                          <div className="col-span-3 text-right">
                            <span className="text-sm font-black text-gray-100 block truncate font-title uppercase tracking-tight">{match.homeTeam}</span>
                            {match.status === 'PLAYED' && (
                              <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20 mt-1 inline-block">Real: {match.homeScoreReal}</span>
                            )}
                          </div>
                          
                          <div className="col-span-1 text-center flex justify-center">
                            <span className="inline-block px-2.5 py-1 rounded bg-gradient-to-r from-primary/30 to-accent/30 border border-accent/20 text-accent font-black text-[11px] skew-x-[-10deg] font-title select-none">
                              VS
                            </span>
                          </div>

                          <div className="col-span-3 text-left">
                            <span className="text-sm font-black text-gray-100 block truncate font-title uppercase tracking-tight">{match.awayTeam}</span>
                            {match.status === 'PLAYED' && (
                              <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20 mt-1 inline-block">Real: {match.awayScoreReal}</span>
                            )}
                          </div>
                        </div>

                        {/* Inputs and Points Column (Right ticket stub) */}
                        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-card-border/50 pt-3 md:pt-0 min-w-[200px]">
                          <div className="flex items-center space-x-2 bg-[#020906] p-1 rounded-xl border border-card-border/60">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={pred.home ?? ''}
                              onChange={(e) => updatePredictionInput(match.id, 'home', e.target.value)}
                              disabled={isSimulating || isMatchClosed || (user !== null && (user.role === 'ADMIN' || !isCurrentPhasePaid))}
                              placeholder="-"
                              className="w-10 h-10 bg-card border border-card-border text-center rounded-lg text-base font-black text-accent focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-60 disabled:text-gray-400 disabled:cursor-not-allowed font-title"
                            />
                            <span className="text-gray-500 font-bold text-xs">-</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={pred.away ?? ''}
                              onChange={(e) => updatePredictionInput(match.id, 'away', e.target.value)}
                              disabled={isSimulating || isMatchClosed || (user !== null && (user.role === 'ADMIN' || !isCurrentPhasePaid))}
                              placeholder="-"
                              className="w-10 h-10 bg-card border border-card-border text-center rounded-lg text-base font-black text-accent focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-60 disabled:text-gray-400 disabled:cursor-not-allowed font-title"
                            />
                          </div>

                          {/* Score Result Badge */}
                          {match.status === 'PLAYED' && (
                            <div className="text-right min-w-[70px]">
                              {(() => {
                                if (pred.home === '' || pred.away === '') {
                                  return <span className="text-[10px] font-bold text-gray-500">Sin pronóstico</span>;
                                }
                                const hPred = parseInt(pred.home, 10);
                                const aPred = parseInt(pred.away, 10);
                                const hReal = match.homeScoreReal!;
                                const aReal = match.awayScoreReal!;
                                
                                let calculatedPts = 0;
                                if (hPred === hReal && aPred === aReal) {
                                  calculatedPts = 3;
                                } else {
                                  const realOutcome = Math.sign(hReal - aReal);
                                  const predOutcome = Math.sign(hPred - aPred);
                                  if (realOutcome === predOutcome) {
                                    calculatedPts = 1;
                                  }
                                }

                                return (
                                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-black font-title tracking-wider ${getPointsPillColor(calculatedPts)}`}>
                                    {calculatedPts === 3 ? '+3 PTS' : calculatedPts === 1 ? '+1 PT' : '0 PTS'}
                                  </span>
                                );
                              })()}
                            </div>
                          )}

                          {/* Pending status details / Simulator inputs */}
                          {match.status === 'PENDING' && (
                            <div className="flex flex-col items-end space-y-1.5 min-w-[120px]">
                              {isSimulating ? (
                                <div className="flex items-center space-x-1.5 bg-amber-500/10 p-1.5 rounded-xl border border-amber-500/30">
                                  <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider pl-1 font-title">Simular:</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={simulatedScores[match.id]?.home || ''}
                                    onChange={(e) => handleSimulateScoreChange(match.id, 'home', e.target.value)}
                                    placeholder="L"
                                    className="w-7 h-7 bg-card border border-amber-500/40 text-center rounded-lg text-xs font-black text-amber-400 focus:outline-none focus:border-amber-400 font-title"
                                  />
                                  <span className="text-gray-500 font-bold text-xs">-</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={simulatedScores[match.id]?.away || ''}
                                    onChange={(e) => handleSimulateScoreChange(match.id, 'away', e.target.value)}
                                    placeholder="V"
                                    className="w-7 h-7 bg-card border border-amber-500/40 text-center rounded-lg text-xs font-black text-amber-400 focus:outline-none focus:border-amber-400 font-title"
                                  />
                                </div>
                              ) : (
                                <div className="text-right text-[11px] text-gray-400 flex items-center space-x-1 justify-end font-sans">
                                  <Calendar className="h-3.5 w-3.5 text-[#6F9F3A]" />
                                  <span>
                                    {new Date(match.matchDate).toLocaleString('es-ES', { 
                                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </section>

        {/* Column 3: Live Leaderboard / Ranking */}
        <section className={`glass-panel p-6 rounded-3xl border border-card-border flex flex-col h-fit ${mobileTab === 'ranking' ? 'block' : 'hidden lg:block'}`}>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-card-border font-title">
            <h3 className="text-base font-extrabold text-gray-100 flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-gold glow-gold" />
              <span>{isSimulating ? 'RANKING SIMULADO' : 'RANKING GENERAL'}</span>
            </h3>
            {isSimulating ? (
              <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                Simulación
              </span>
            ) : (
              <span className="text-[10px] font-black text-accent bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                En Vivo
              </span>
            )}
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
            {(() => {
              const activeRanking = isSimulating ? simulatedRanking : ranking;
              if (activeRanking.length === 0) {
                return (
                  <div className="text-center py-8 text-sm text-gray-500 font-sans">
                    No hay usuarios en el ranking aún.
                  </div>
                );
              }

              let currentRank = 1;
              const rankedList = activeRanking.map((row, idx) => {
                if (idx > 0 && row.points < activeRanking[idx - 1].points) {
                  currentRank = idx + 1;
                }
                return { ...row, rank: currentRank };
              });

              return rankedList.map((row) => {
                const isCurrentUser = user && row.id === user.id;
                
                // Ranking positions metallic styles
                let medalStyle = 'bg-card border border-card-border text-gray-400 font-bold';
                if (row.rank === 1) medalStyle = 'bg-gradient-to-br from-gold to-[#7A532E] text-white font-black shadow-md shadow-gold/25 border border-gold/40 scale-105';
                else if (row.rank === 2) medalStyle = 'bg-gradient-to-br from-slate-200 to-slate-400 text-[#030c08] border border-slate-300/40 font-black';
                else if (row.rank === 3) medalStyle = 'bg-gradient-to-br from-[#8C5D3A] to-[#5C3A21] text-white border border-[#8C5D3A]/40 font-black';

                return (
                  <div 
                    key={row.id} 
                    onClick={() => {
                      if (user && user.role !== 'ADMIN' && !isCurrentUser) {
                        fetchComparison(row.id);
                      }
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl transition-all border ${
                      isCurrentUser 
                        ? 'bg-accent/10 border-accent/40 shadow-md shadow-accent/5' 
                        : 'bg-background/40 border-card-border/50 hover:border-card-border hover:bg-card-border/10 cursor-pointer hover:translate-x-0.5'
                    }`}
                    title={isCurrentUser ? 'Tú' : 'Clic para comparar Cara a Cara'}
                  >
                    <div className="flex items-center space-x-3.5 min-w-0 font-sans">
                      <span className={`w-7 h-7 flex items-center justify-center rounded-xl text-xs font-title shrink-0 ${medalStyle}`}>
                        {row.rank}
                      </span>
                      <div className="min-w-0">
                        <span className={`text-sm font-bold truncate block ${isCurrentUser ? 'text-accent' : 'text-gray-200'}`}>
                          {row.name} {isCurrentUser && '(Tú)'}
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          {row.predictionsCount} pronóstico(s) guardado(s)
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-title flex items-center space-x-2">
                      <div>
                        <span className={`text-base font-black ${isCurrentUser ? 'text-accent' : 'text-gray-100'}`}>
                          {row.points}
                        </span>
                        <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">PTS</span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </section>
      </main>
      )}

      {/* Auth Modal (Login/Register) */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl relative animate-in fade-in zoom-in-95 duration-200 border border-card-border bg-[#04110a]">
            <div className="flex items-center space-x-3 mb-4 border-b border-card-border pb-3.5">
              <div className="bg-card p-1 rounded-xl border border-card-border shadow-sm shrink-0">
                <img src="/geourp.png" alt="Logo GEO-URP" className="h-9 w-9 object-contain rounded-lg" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-100 flex items-center space-x-2 font-title">
                  <span>{authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}</span>
                </h3>
                <span className="text-[10px] text-accent font-extrabold uppercase tracking-wider font-title block">Polla GEO-URP</span>
              </div>
            </div>
            
            <p className="text-xs text-gray-400 font-sans">
              {authMode === 'login' 
                ? 'Accede para guardar tus pronósticos del mundial.' 
                : 'Regístrate para guardar tus pronósticos y ver tu posición.'}
            </p>

            <form onSubmit={handleAuthSubmit} className="space-y-4 mt-6">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider font-title">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={authForm.name}
                    onChange={(e) => setAuthForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-background border border-card-border focus:border-accent rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-100 outline-none transition-colors font-sans"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider font-title">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={authForm.email}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-background border border-card-border focus:border-accent rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-100 outline-none transition-colors font-sans"
                  placeholder="ejemplo@correo.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider font-title">Contraseña</label>
                <input
                  type="password"
                  required
                  value={authForm.password}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-background border border-card-border focus:border-accent rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-100 outline-none transition-colors font-sans"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full py-3 bg-accent hover:bg-accent/90 text-background font-black rounded-xl shadow-lg shadow-accent/15 transition-all flex items-center justify-center disabled:opacity-50 font-title uppercase tracking-wider text-xs"
              >
                {formSubmitting ? (
                  <div className="h-5 w-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                ) : authMode === 'login' ? (
                  'Entrar'
                ) : (
                  'Registrarse e Iniciar'
                )}
              </button>
            </form>

            <div className="mt-5 text-center text-xs text-gray-400 font-sans">
              {authMode === 'login' ? (
                <span>
                  ¿No tienes una cuenta?{' '}
                  <button 
                    onClick={() => setAuthMode('register')} 
                    className="text-accent hover:underline font-bold"
                  >
                    Regístrate aquí
                  </button>
                </span>
              ) : (
                <span>
                  ¿Ya tienes una cuenta?{' '}
                  <button 
                    onClick={() => setAuthMode('login')} 
                    className="text-accent hover:underline font-bold"
                  >
                    Inicia sesión aquí
                  </button>
                </span>
              )}
            </div>

            <button
              onClick={() => { setShowAuthModal(false); setPendingSaveAfterAuth(false); }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 text-sm font-bold p-1 hover:bg-card-border/30 rounded-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Inactive Account Activation Flow Modal */}
      {showInactiveModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl relative animate-in fade-in zoom-in-95 duration-200 border border-card-border bg-[#04110a]">
            <div className="bg-gold/10 p-3 rounded-2xl w-fit border border-gold/20 mb-4">
              <AlertTriangle className="h-6 w-6 text-gold" />
            </div>

            <h3 className="text-lg font-black text-gray-100 font-title uppercase tracking-tight">Fase Pendiente de Inscripción</h3>
            
            <p className="text-sm text-gray-300 mt-2 leading-relaxed font-sans">
              Cada fase del torneo requiere de una inscripción de <strong className="text-gold">10 soles</strong> para poder guardar tus pronósticos.
            </p>

            <p className="text-xs text-gray-300 mt-2 font-sans">
              🏆 Esta inscripción asegura el <strong className="text-accent font-bold">premio de 100 soles al primer lugar</strong> (ya sea una persona o repartido entre quienes ocupen ese puesto).
            </p>

            <p className="text-xs text-gray-400 mt-4 bg-[#020906] p-3 rounded-xl border border-card-border font-sans">
              📌 Envía tu pago de 10 soles por WhatsApp al administrador indicando la fase <strong>{activePhase?.name}</strong> para que la desbloquee en tu cuenta.
            </p>

            <div className="mt-6 flex flex-col space-y-2 font-title">
              <a 
                href={`https://wa.me/51999999999?text=Hola%20Admin,%20he%20realizado%20mi%20pago%20de%2010%20soles%20para%20la%20fase%20${encodeURIComponent(activePhase?.name || '')}.%20Activa%20mi%20participación.`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-full py-3 bg-[#25D366] hover:bg-[#20ba5a] text-[#030c08] font-black rounded-xl text-center shadow-lg shadow-[#25D366]/10 flex items-center justify-center space-x-2 transition-all uppercase tracking-wider text-xs"
              >
                <MessageCircle className="h-5 w-5 fill-current" />
                <span>Enviar Pago por WhatsApp</span>
              </a>
              <button
                onClick={() => setShowInactiveModal(false)}
                className="w-full py-2.5 bg-card hover:bg-card-border/40 text-gray-300 border border-card-border font-black rounded-xl transition-all uppercase tracking-wider text-xs"
              >
                Cerrar
              </button>
            </div>

            <button
              onClick={() => setShowInactiveModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 text-sm font-bold p-1 hover:bg-card-border/30 rounded-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl relative animate-in fade-in zoom-in-95 duration-200 border border-card-border bg-[#04110a]">
            <h3 className="text-xl font-black text-gray-100 flex items-center space-x-2 font-title">
              <Key className="h-5 w-5 text-accent" />
              <span>Cambiar Contraseña</span>
            </h3>
            
            <p className="text-xs text-gray-400 mt-1.5 font-sans">
              Actualiza tu contraseña de acceso de manera segura.
            </p>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4 mt-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider font-title">Contraseña Actual</label>
                <input
                  type="password"
                  required
                  value={changePasswordForm.currentPassword}
                  onChange={(e) => setChangePasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full bg-background border border-card-border focus:border-accent rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-100 outline-none transition-colors font-sans"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider font-title">Nueva Contraseña</label>
                <input
                  type="password"
                  required
                  value={changePasswordForm.newPassword}
                  onChange={(e) => setChangePasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full bg-background border border-card-border focus:border-accent rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-100 outline-none transition-colors font-sans"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider font-title">Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  required
                  value={changePasswordForm.confirmNewPassword}
                  onChange={(e) => setChangePasswordForm(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                  className="w-full bg-background border border-card-border focus:border-accent rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-100 outline-none transition-colors font-sans"
                  placeholder="Repite la nueva contraseña"
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full py-3 bg-accent hover:bg-accent/90 text-background font-black rounded-xl shadow-lg shadow-accent/15 transition-all flex items-center justify-center disabled:opacity-50 font-title uppercase tracking-wider text-xs"
              >
                {changingPassword ? (
                  <div className="h-5 w-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Actualizar Contraseña'
                )}
              </button>
            </form>

            <button
              onClick={() => {
                setShowChangePasswordModal(false);
                setChangePasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 text-sm font-bold p-1 hover:bg-card-border/30 rounded-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Cara a Cara (Comparison) Modal */}
      {showComparisonModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full max-h-[85vh] flex flex-col p-6 rounded-3xl relative animate-in fade-in zoom-in-95 duration-200 border border-card-border bg-[#04110a] overflow-hidden">
            <h3 className="text-lg font-black text-gray-100 flex items-center space-x-2 font-title shrink-0 pb-4 border-b border-card-border">
              <Trophy className="h-5 w-5 text-gold glow-gold" />
              <span>Comparador Cara a Cara</span>
            </h3>

            {comparisonLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-3 shrink-0">
                <div className="h-8 w-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-400 font-bold font-title">Cargando comparación...</span>
              </div>
            ) : comparisonData ? (
              <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1 font-sans">
                <div className="bg-accent/10 border border-accent/20 p-4 rounded-2xl text-xs text-accent">
                  Estás comparando tus pronósticos con los de <strong className="text-gray-100">{comparisonData.otherUser.name}</strong>.
                  Recuerda que los pronósticos de fases abiertas se muestran ocultos para evitar copias.
                </div>

                <div className="space-y-6">
                  {comparisonData.comparison.map((phase: any) => {
                    const hasMatches = phase.matches.length > 0;
                    if (!hasMatches) return null;

                    return (
                      <div key={phase.id} className="space-y-3">
                        <div className="flex justify-between items-center bg-card-border/10 px-3 py-2 rounded-xl">
                          <span className="text-xs font-black text-gray-200 font-title uppercase tracking-wider">{phase.name}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                            phase.isClosed 
                              ? 'bg-accent/10 text-accent border border-accent/20'
                              : 'bg-gold/15 text-gold border border-gold/30'
                          }`}>
                            {phase.isClosed ? (
                              <>
                                <Unlock className="h-2.5 w-2.5 mr-0.5 text-accent" />
                                <span>Revelados</span>
                              </>
                            ) : (
                              <>
                                <Lock className="h-2.5 w-2.5 mr-0.5 text-gold" />
                                <span>Ocultos hasta el cierre</span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {phase.matches.map((match: any) => (
                            <div key={match.id} className="bg-background/50 border border-card-border/40 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                              {/* Match Teams & Date */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 font-bold text-gray-200 font-title">
                                  <span>{match.homeTeam}</span>
                                  <span className="text-[10px] text-accent/70 px-1.5 py-0.5 bg-accent/5 rounded border border-accent/10">VS</span>
                                  <span>{match.awayTeam}</span>
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">
                                  {match.status === 'PLAYED' ? (
                                    <span className="font-bold text-accent">Resultado Real: {match.homeScoreReal} - {match.awayScoreReal}</span>
                                  ) : (
                                    <span>Pendiente</span>
                                  )}
                                </div>
                              </div>

                              {/* Forecast Comparison columns */}
                              <div className="grid grid-cols-2 gap-4 shrink-0 sm:min-w-[240px]">
                                {/* My Prediction */}
                                <div className="bg-[#020906] p-2.5 rounded-xl border border-card-border/40 text-center flex flex-col justify-between">
                                  <span className="text-[9px] text-gray-400 uppercase tracking-wider block font-bold">Tú</span>
                                  <span className="text-sm font-black text-gray-100 mt-1 block font-title">
                                    {match.myPrediction ? (
                                      `${match.myPrediction.homeScorePredicted} - ${match.myPrediction.awayScorePredicted}`
                                    ) : (
                                      <span className="text-gray-600 font-normal italic">-</span>
                                    )}
                                  </span>
                                  {match.status === 'PLAYED' && match.myPrediction && (
                                    <span className={`text-[8px] font-black font-title tracking-wider px-1.5 py-0.5 rounded-full inline-block mt-1.5 ${
                                      match.myPrediction.points === 3 
                                        ? 'bg-accent/15 text-accent border border-accent/20' 
                                        : match.myPrediction.points === 1 
                                        ? 'bg-gold/15 text-gold border border-gold/20' 
                                        : 'bg-red-500/15 text-red-400 border border-red-500/20'
                                    }`}>
                                      +{match.myPrediction.points ?? 0} PTS
                                    </span>
                                  )}
                                </div>

                                {/* Other User's Prediction */}
                                <div className="bg-[#020906] p-2.5 rounded-xl border border-card-border/40 text-center flex flex-col justify-between">
                                  <span className="text-[9px] text-gray-400 uppercase tracking-wider block font-bold truncate max-w-[100px]">{comparisonData.otherUser.name}</span>
                                  <span className="text-sm font-black text-gray-100 mt-1 block font-title">
                                    {match.otherPrediction ? (
                                      match.otherPrediction.isMasked ? (
                                        <span className="text-gold flex items-center justify-center text-[10px] font-bold" title="Se revelará cuando cierre la fase">
                                          <Lock className="h-3 w-3 mr-0.5 shrink-0" />
                                          <span>Oculto</span>
                                        </span>
                                      ) : (
                                        `${match.otherPrediction.homeScorePredicted} - ${match.otherPrediction.awayScorePredicted}`
                                      )
                                    ) : (
                                      <span className="text-gray-600 font-normal italic">-</span>
                                    )}
                                  </span>
                                  {match.status === 'PLAYED' && match.otherPrediction && (
                                    <span className={`text-[8px] font-black font-title tracking-wider px-1.5 py-0.5 rounded-full inline-block mt-1.5 ${
                                      match.otherPrediction.points === 3 
                                        ? 'bg-accent/15 text-accent border border-accent/20' 
                                        : match.otherPrediction.points === 1 
                                        ? 'bg-gold/15 text-gold border border-gold/20' 
                                        : 'bg-red-500/15 text-red-400 border border-red-500/20'
                                    }`}>
                                      +{match.otherPrediction.points ?? 0} PTS
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-400 py-8 font-sans">
                Ocurrió un error al cargar los datos.
              </div>
            )}

            <div className="shrink-0 pt-4 border-t border-card-border flex justify-end">
              <button
                onClick={() => {
                  setShowComparisonModal(false);
                  setComparisonData(null);
                }}
                className="px-5 py-2.5 bg-card hover:bg-card-border/40 border border-card-border text-gray-300 font-bold rounded-xl text-xs uppercase tracking-wider font-title"
              >
                Cerrar
              </button>
            </div>

            <button
              onClick={() => {
                setShowComparisonModal(false);
                setComparisonData(null);
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 text-sm font-bold p-1 hover:bg-card-border/30 rounded-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* Rules & Game Guide Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-3xl w-full max-h-[85vh] flex flex-col p-6 rounded-3xl relative animate-in fade-in zoom-in-95 duration-200 border border-card-border bg-[#04110a] overflow-hidden">
            
            <div className="flex items-center space-x-3 pb-4 border-b border-card-border shrink-0">
              <div className="bg-card p-1 rounded-xl border border-card-border shadow-sm shrink-0">
                <img src="/geourp.png" alt="Logo GEO-URP" className="h-9 w-9 object-contain rounded-lg" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-100 flex items-center space-x-2 font-title uppercase tracking-tight">
                  <span>Guía del Participante y Reglas</span>
                </h3>
                <span className="text-[10px] text-accent font-extrabold uppercase tracking-wider font-title block">Polla GEO-URP 2026</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1 font-sans text-left">
              
              {/* Introduction Banner */}
              <div className="bg-primary/10 border border-card-border/40 p-4 rounded-2xl text-xs text-gray-300 leading-relaxed">
                ¡Bienvenido a la <strong>Polla Mundialista GEO-URP</strong>! Este juego está organizado por la asociación <a href="https://geourp.org/" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline font-bold">GEO-URP</a> (Ingeniería Geográfica - URP). La plataforma ofrece un entorno transparente, divertido y competitivo para demostrar tus dotes de pronosticador en la Copa del Mundo 2026.
              </div>

              {/* Grid sections inside modal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Rules Box */}
                <div className="bg-[#020906]/60 border border-card-border/40 p-4 rounded-2xl space-y-3">
                  <h4 className="text-xs font-black text-accent font-title uppercase tracking-wider flex items-center space-x-1.5">
                    <Trophy className="h-4 w-4" />
                    <span>Reglas de Puntajes</span>
                  </h4>
                  <ul className="text-xs text-gray-400 space-y-2 leading-relaxed">
                    <li className="flex items-start space-x-1.5">
                      <span className="text-accent font-bold">🎯</span>
                      <span><strong className="text-gray-200">Marcador Exacto (+3 Ptos):</strong> Aciertas los goles exactos del local y visitante. (Ej. Pronóstico: 2-1, Resultado: 2-1).</span>
                    </li>
                    <li className="flex items-start space-x-1.5">
                      <span className="text-accent font-bold">⚽</span>
                      <span><strong className="text-gray-200">Resultado Simple (+1 Pto):</strong> Aciertas el ganador o empate, pero no los goles exactos. (Ej. Pronóstico: 1-0, Resultado: 3-1).</span>
                    </li>
                    <li className="flex items-start space-x-1.5">
                      <span className="text-red-400 font-bold">❌</span>
                      <span><strong className="text-gray-200">Incorrecto (0 Ptos):</strong> No aciertas ni el ganador ni el empate.</span>
                    </li>
                    <li className="flex items-start space-x-1.5 bg-background/50 p-2 rounded-lg border border-card-border/20 mt-1">
                      <span className="text-gold font-bold">⏳</span>
                      <span><strong className="text-gray-200">Hora Límite:</strong> Puedes registrar o modificar tus marcadores hasta justo antes de que inicie cada partido individual. Una vez iniciado, el sistema bloquea los campos de ese encuentro automáticamente.</span>
                    </li>
                  </ul>
                </div>

                {/* Payments Box */}
                <div className="bg-[#020906]/60 border border-card-border/40 p-4 rounded-2xl space-y-3">
                  <h4 className="text-xs font-black text-gold font-title uppercase tracking-wider flex items-center space-x-1.5">
                    <DollarSign className="h-4 w-4" />
                    <span>Inscripciones y Premios</span>
                  </h4>
                  <ul className="text-xs text-gray-400 space-y-2 leading-relaxed">
                    <li className="flex items-start space-x-1.5">
                      <span className="text-gold font-bold">💵</span>
                      <span><strong className="text-gray-200">Costo por fase:</strong> Participar en cada fase del torneo cuesta <strong className="text-gold">10 Soles</strong>. Las fases son independientes.</span>
                    </li>
                    <li className="flex items-start space-x-1.5">
                      <span className="text-gold font-bold">🎁</span>
                      <span><strong className="text-gray-200">Premio por Fase:</strong> Se otorga un premio único de <strong className="text-accent">100 Soles</strong> para el primer lugar de la fase. Si dos o más personas empatan en el primer puesto, el premio se divide equitativamente entre los ganadores.</span>
                    </li>
                    <li className="flex items-start space-x-1.5">
                      <span className="text-gold font-bold">⚡</span>
                      <span><strong className="text-gray-200">Activación:</strong> Envía tu captura de pago al administrador por WhatsApp indicando tu usuario y la fase que deseas habilitar.</span>
                    </li>
                    <li className="flex items-start space-x-1.5 bg-background/50 p-2 rounded-lg border border-card-border/20 mt-1">
                      <span className="text-accent font-bold">✨</span>
                      <span><strong className="text-gray-200">Premio por fase:</strong> Al separarse por fases, si te va mal en la primera fase, puedes competir por el premio de la siguiente fase volviendo a inscribirte.</span>
                    </li>
                  </ul>
                </div>

              </div>

              {/* Organization and Transparency */}
              <div className="bg-[#020906]/30 border border-card-border/30 p-4 rounded-2xl space-y-2 text-xs text-gray-400">
                <h4 className="text-xs font-black text-gray-300 font-title uppercase tracking-wider flex items-center space-x-1.5">
                  <Users className="h-4 w-4 text-accent" />
                  <span>Comunidad y Seguimiento GEO-URP</span>
                </h4>
                <p className="leading-relaxed">
                  Para asegurar la diversión y competencia justa, una vez iniciados los partidos, los pronósticos de los rivales se vuelven públicos para que todos puedan realizar el seguimiento cara a cara en tiempo real.
                </p>
              </div>

            </div>

            <div className="shrink-0 pt-4 border-t border-card-border flex justify-end">
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-5 py-2.5 bg-card hover:bg-card-border/40 border border-card-border text-gray-300 font-bold rounded-xl text-xs uppercase tracking-wider font-title"
              >
                Entendido
              </button>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 text-sm font-bold p-1 hover:bg-card-border/30 rounded-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
