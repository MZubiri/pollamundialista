'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Play, 
  Settings, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Activity, 
  Save, 
  RefreshCw,
  LogOut,
  UserCheck,
  UserX,
  Sparkles,
  Download
} from 'lucide-react';
import Link from 'next/link';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalPredictions: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  phaseStatuses?: { phaseId: string; status: 'ACTIVE' | 'INACTIVE' }[];
}

interface Phase {
  id: string;
  name: string;
  openAt: string;
  closeAt: string;
  status: 'LOCKED' | 'OPEN' | 'CLOSED';
  _count?: { matches: number };
}

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  phaseId: string;
  homeScoreReal: number | null;
  awayScoreReal: number | null;
  status: 'PENDING' | 'PLAYED';
  phase: { name: string };
}

const toLocalISOString = (date: Date | string) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'phases' | 'matches' | 'results'>('dashboard');
  const [loading, setLoading] = useState(true);

  // States for API data
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form states
  const [phaseForm, setPhaseForm] = useState({ id: '', name: '', openAt: '', closeAt: '', status: 'LOCKED' });
  const [isEditingPhase, setIsEditingPhase] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);

  const [matchForm, setMatchForm] = useState({ id: '', homeTeam: '', awayTeam: '', matchDate: '', phaseId: '' });
  const [isEditingMatch, setIsEditingMatch] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);

  // Score states
  const [scoresInput, setScoresInput] = useState<Record<string, { home: string; away: string }>>({});

  // Auth checking
  const [adminUser, setAdminUser] = useState<any>(null);

  const verifyAdmin = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (!data.user || data.user.role !== 'ADMIN') {
        window.location.href = '/';
      } else {
        setAdminUser(data.user);
        loadAllData();
      }
    } catch (e) {
      window.location.href = '/';
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchUsers('', 1),
        fetchPhases(),
        fetchMatches()
      ]);
    } catch (e) {
      toast.error('Error al cargar datos del panel admin.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    const res = await fetch('/api/admin/stats');
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    }
  };

  const fetchUsers = async (search = userSearch, page = 1) => {
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&page=${page}&limit=15`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.currentPage || 1);
    }
  };

  const fetchPhases = async () => {
    const res = await fetch('/api/admin/phases');
    if (res.ok) {
      const data = await res.json();
      setPhases(data.phases);
    }
  };

  const fetchMatches = async () => {
    const res = await fetch('/api/admin/matches');
    if (res.ok) {
      const data = await res.json();
      setMatches(data.matches);
      
      // Initialize scores inputs with existing real scores
      const initialScores: Record<string, { home: string; away: string }> = {};
      data.matches.forEach((m: Match) => {
        initialScores[m.id] = {
          home: m.homeScoreReal !== null ? m.homeScoreReal.toString() : '',
          away: m.awayScoreReal !== null ? m.awayScoreReal.toString() : ''
        };
      });
      setScoresInput(initialScores);
    }
  };

  useEffect(() => {
    verifyAdmin();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserSearch(val);
    fetchUsers(val, 1);
  };

  // Toggle user status ACTIVE/INACTIVE
  const toggleUserStatus = async (userId: string, currentStatus: 'ACTIVE' | 'INACTIVE') => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success('Estado de usuario actualizado.');
        fetchUsers(userSearch, currentPage);
        fetchStats();
      } else {
        toast.error('Error al cambiar el estado.');
      }
    } catch (e) {
      toast.error('Error en el servidor.');
    }
  };

  // Toggle user status for a specific phase
  const toggleUserPhaseStatus = async (userId: string, phaseId: string, currentStatus: 'ACTIVE' | 'INACTIVE') => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, phaseId }),
      });
      if (res.ok) {
        toast.success('Estado de pago de fase actualizado.');
        fetchUsers(userSearch, currentPage);
        fetchStats();
      } else {
        toast.error('Error al cambiar el estado de pago.');
      }
    } catch (e) {
      toast.error('Error en el servidor.');
    }
  };

  // Delete user account
  const deleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar permanentemente este usuario y todos sus pronósticos? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Usuario eliminado correctamente.');
        fetchUsers(userSearch, currentPage);
        fetchStats();
      } else {
        toast.error(data.error || 'No se pudo eliminar el usuario.');
      }
    } catch (e) {
      toast.error('Error en el servidor.');
    }
  };

  // Create or Update Phase
  const handlePhaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isEditingPhase ? `/api/admin/phases/${phaseForm.id}` : '/api/admin/phases';
    const method = isEditingPhase ? 'PUT' : 'POST';

    try {
      const payload = {
        ...phaseForm,
        openAt: phaseForm.openAt ? new Date(phaseForm.openAt).toISOString() : '',
        closeAt: phaseForm.closeAt ? new Date(phaseForm.closeAt).toISOString() : '',
      };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(isEditingPhase ? 'Fase actualizada.' : 'Fase creada.');
        setShowPhaseModal(false);
        setPhaseForm({ id: '', name: '', openAt: '', closeAt: '', status: 'LOCKED' });
        setIsEditingPhase(false);
        fetchPhases();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Ocurrió un error.');
      }
    } catch (error) {
      toast.error('Error en el servidor.');
    }
  };

  const deletePhase = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta fase? Esto eliminará todos sus partidos y pronósticos.')) return;
    try {
      const res = await fetch(`/api/admin/phases/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Fase eliminada correctamente.');
        fetchPhases();
        fetchStats();
      } else {
        toast.error('No se pudo eliminar la fase.');
      }
    } catch (e) {
      toast.error('Error del servidor.');
    }
  };

  // Create or Update Match
  const handleMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isEditingMatch ? `/api/admin/matches/${matchForm.id}` : '/api/admin/matches';
    const method = isEditingMatch ? 'PUT' : 'POST';

    try {
      const payload = {
        ...matchForm,
        matchDate: matchForm.matchDate ? new Date(matchForm.matchDate).toISOString() : '',
      };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(isEditingMatch ? 'Partido actualizado.' : 'Partido creado.');
        setShowMatchModal(false);
        setMatchForm({ id: '', homeTeam: '', awayTeam: '', matchDate: '', phaseId: '' });
        setIsEditingMatch(false);
        fetchMatches();
        fetchStats();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Ocurrió un error.');
      }
    } catch (error) {
      toast.error('Error en el servidor.');
    }
  };

  const deleteMatch = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este partido?')) return;
    try {
      const res = await fetch(`/api/admin/matches/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Partido eliminado correctamente.');
        fetchMatches();
        fetchStats();
      } else {
        toast.error('No se pudo eliminar el partido.');
      }
    } catch (e) {
      toast.error('Error del servidor.');
    }
  };

  // Update Score & Recalculate Points
  const handleScoreChange = (matchId: string, team: 'home' | 'away', val: string) => {
    if (val !== '' && !/^\d+$/.test(val)) return;
    setScoresInput(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team]: val
      }
    }));
  };

  const saveMatchScore = async (matchId: string) => {
    const input = scoresInput[matchId];
    if (!input || input.home === '' || input.away === '') {
      toast.error('Introduce marcadores válidos para guardar.');
      return;
    }

    const saveToast = toast.loading('Guardando marcador y recalculando puntos...');
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeScoreReal: parseInt(input.home, 10),
          awayScoreReal: parseInt(input.away, 10)
        }),
      });

      if (res.ok) {
        toast.dismiss(saveToast);
        toast.success('Marcador guardado y puntos recalculados.');
        fetchMatches();
      } else {
        toast.dismiss(saveToast);
        toast.error('Error al guardar el marcador.');
      }
    } catch (e) {
      toast.dismiss(saveToast);
      toast.error('Error en el servidor.');
    }
  };

  const resetMatchScore = async (matchId: string) => {
    if (!confirm('¿Estás seguro de reiniciar este resultado? Esto dejará el partido pendiente y vaciará los puntos de esta predicción.')) return;
    const saveToast = toast.loading('Reiniciando marcador...');
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeScoreReal: null,
          awayScoreReal: null
        }),
      });

      if (res.ok) {
        toast.dismiss(saveToast);
        toast.success('Marcador reiniciado con éxito.');
        setScoresInput(prev => ({
          ...prev,
          [matchId]: { home: '', away: '' }
        }));
        fetchMatches();
      } else {
        toast.dismiss(saveToast);
        toast.error('Error al reiniciar el marcador.');
      }
    } catch (e) {
      toast.dismiss(saveToast);
      toast.error('Error en el servidor.');
    }
  };

  if (loading || !adminUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
        <div className="h-10 w-10 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-gray-400 font-semibold text-sm font-sans">Cargando panel administrador...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Admin header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 py-4 border-b border-card-border mb-8">
        <div className="flex items-center space-x-3">
          <Link href="/" className="p-2 hover:bg-card-border/50 text-gray-400 hover:text-gray-200 rounded-lg transition-colors border border-card-border shrink-0" title="Volver al inicio">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="bg-card p-1.5 rounded-xl border border-card-border shadow-sm shrink-0">
            <img src="/geourp.png" alt="Logo GEO-URP" className="h-9 w-9 object-contain rounded-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-accent flex items-center space-x-2 font-title uppercase">
              <Settings className="h-4 w-4" />
              <span>PANEL ADMINISTRADOR</span>
            </h1>
            <span className="text-xs text-gray-400 block mt-0.5 font-sans">Gestión de usuarios, fases, partidos y resultados</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-card-border/20 px-4 py-2 rounded-xl border border-card-border/40 font-title">
          <Trophy className="h-4 w-4 text-gold" />
          <span className="text-xs font-bold text-gray-300">Admin: {adminUser.name}</span>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-1 space-y-2 h-fit font-title">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-sm transition-all border flex items-center space-x-3 ${
              activeTab === 'dashboard'
                ? 'bg-accent/10 border-accent/40 text-accent shadow-sm'
                : 'bg-card/40 border-card-border/50 text-gray-400 hover:border-gray-600 hover:text-gray-200'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-sm transition-all border flex items-center space-x-3 ${
              activeTab === 'users'
                ? 'bg-accent/10 border-accent/40 text-accent shadow-sm'
                : 'bg-card/40 border-card-border/50 text-gray-400 hover:border-gray-600 hover:text-gray-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Gestión de Usuarios</span>
          </button>

          <button
            onClick={() => setActiveTab('phases')}
            className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-sm transition-all border flex items-center space-x-3 ${
              activeTab === 'phases'
                ? 'bg-accent/10 border-accent/40 text-accent shadow-sm'
                : 'bg-card/40 border-card-border/50 text-gray-400 hover:border-gray-600 hover:text-gray-200'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Gestión de Fases</span>
          </button>

          <button
            onClick={() => setActiveTab('matches')}
            className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-sm transition-all border flex items-center space-x-3 ${
              activeTab === 'matches'
                ? 'bg-accent/10 border-accent/40 text-accent shadow-sm'
                : 'bg-card/40 border-card-border/50 text-gray-400 hover:border-gray-600 hover:text-gray-200'
            }`}
          >
            <Play className="h-4 w-4" />
            <span>Gestión de Partidos</span>
          </button>

          <button
            onClick={() => setActiveTab('results')}
            className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-sm transition-all border flex items-center space-x-3 ${
              activeTab === 'results'
                ? 'bg-accent/10 border-accent/40 text-accent shadow-sm'
                : 'bg-card/40 border-card-border/50 text-gray-400 hover:border-gray-600 hover:text-gray-200'
            }`}
          >
            <Trophy className="h-4 w-4" />
            <span>Cargar Resultados</span>
          </button>
        </aside>

        {/* Tab Content Panel */}
        <main className="lg:col-span-3">
          
          {/* TAB 1: DASHBOARD STATS */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              <h3 className="text-lg font-black text-gray-100 font-title">Resumen General</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-title">
                <div className="glass-card p-5 rounded-2xl border border-card-border">
                  <div className="text-gray-500 text-xs font-bold uppercase tracking-wider font-sans">Total Usuarios</div>
                  <div className="text-2xl font-black text-gray-100 mt-2">{stats.totalUsers}</div>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-card-border">
                  <div className="text-accent text-xs font-bold uppercase tracking-wider font-sans">Usuarios Activos</div>
                  <div className="text-2xl font-black text-accent mt-2">{stats.activeUsers}</div>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-card-border">
                  <div className="text-gold text-xs font-bold uppercase tracking-wider font-sans">Usuarios Inactivos</div>
                  <div className="text-2xl font-black text-gold mt-2">{stats.inactiveUsers}</div>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-card-border">
                  <div className="text-indigo-400 text-xs font-bold uppercase tracking-wider font-sans">Pronósticos Registrados</div>
                  <div className="text-2xl font-black text-indigo-300 mt-2">{stats.totalPredictions}</div>
                </div>
              </div>

              {/* Quick info panel */}
              <div className="glass-panel p-6 rounded-2xl border border-card-border/60">
                <h4 className="text-sm font-bold text-gray-200 mb-2 flex items-center space-x-2 font-title">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span>Guía del Administrador</span>
                </h4>
                <ul className="text-xs text-gray-400 space-y-2 list-disc list-inside font-sans">
                  <li>Usa <strong>Gestión de Usuarios</strong> para cambiar el estado de INACTIVO a ACTIVO tras recibir el pago simbólico.</li>
                  <li>Usa <strong>Gestión de Fases</strong> para habilitar o cerrar los pronósticos de fases específicas.</li>
                  <li>Usa <strong>Gestión de Partidos</strong> para agregar nuevos encuentros futbolísticos por fase.</li>
                  <li>Usa <strong>Cargar Resultados</strong> para registrar marcadores reales y gatillar el recálculo automático de puntajes.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center space-x-3.5">
                  <h3 className="text-lg font-black text-gray-100 font-title">Gestión de Usuarios</h3>
                  <a
                    href="/api/admin/users/export"
                    download
                    className="px-3.5 py-1.5 bg-accent/15 text-accent hover:bg-accent/25 border border-accent/20 rounded-xl text-xs font-bold font-title flex items-center space-x-1.5 transition-all shadow-sm shadow-accent/5 hover:-translate-y-0.5"
                    title="Exportar base de datos completa de usuarios y pagos a formato CSV"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Exportar Excel/CSV</span>
                  </a>
                </div>
                
                {/* Search Bar */}
                <div className="relative max-w-sm w-full font-sans">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={handleSearchChange}
                    className="w-full bg-card border border-card-border focus:border-accent rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-gray-100 outline-none transition-colors"
                    placeholder="Buscar por nombre, correo o ID..."
                  />
                </div>
              </div>

              <div className="glass-panel rounded-2xl border border-card-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-background/80 border-b border-card-border text-gray-400 font-bold uppercase tracking-wider font-title text-[10px]">
                      <tr>
                        <th className="p-4">Usuario</th>
                        <th className="p-4">Fecha de Registro</th>
                        <th className="p-4">Estado</th>
                        <th className="p-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border/40 font-semibold text-gray-200">
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-gray-500">
                            Ningún usuario coincide con los términos de búsqueda.
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => (
                          <tr key={u.id} className="hover:bg-card-border/10">
                            <td className="p-4">
                              <span className="block font-bold text-gray-100">{u.name}</span>
                              <span className="block text-[10px] text-gray-500 font-medium mt-0.5">{u.email}</span>
                              <span className="block text-[9px] text-gray-600 font-mono mt-0.5">ID: {u.id}</span>
                            </td>
                            <td className="p-4 text-gray-400">
                              {new Date(u.createdAt).toLocaleDateString('es-ES', { 
                                day: 'numeric', month: 'short', year: 'numeric' 
                              })}
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1.5 max-w-xs font-title text-[9px]">
                                {phases.map((p) => {
                                  const phaseStatusObj = u.phaseStatuses?.find(ps => ps.phaseId === p.id);
                                  const isPaid = phaseStatusObj ? phaseStatusObj.status === 'ACTIVE' : false;
                                  return (
                                    <button
                                      key={p.id}
                                      onClick={() => toggleUserPhaseStatus(u.id, p.id, isPaid ? 'ACTIVE' : 'INACTIVE')}
                                      className={`px-2.5 py-1 rounded-lg font-black border transition-all ${
                                        isPaid 
                                          ? 'bg-accent/10 text-accent border-accent/30 hover:bg-accent/20' 
                                          : 'bg-gold/5 text-gold/60 border-gold/15 hover:bg-gold/10'
                                      }`}
                                      title={`Clic para alternar pago de ${p.name}`}
                                    >
                                      {p.name.replace('Ronda de ', 'R')}: {isPaid ? 'S/10 OK' : 'DEBE'}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end items-center gap-2">
                                <button
                                  onClick={() => toggleUserStatus(u.id, u.status)}
                                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all inline-flex items-center space-x-1 font-title ${
                                    u.status === 'ACTIVE'
                                      ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20'
                                      : 'bg-accent/15 text-accent hover:bg-accent/25 border border-accent/20'
                                  }`}
                                >
                                  {u.status === 'ACTIVE' ? (
                                    <>
                                      <UserX className="h-3.5 w-3.5" />
                                      <span>Suspender</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="h-3.5 w-3.5" />
                                      <span>Activar</span>
                                    </>
                                  )}
                                </button>
                                
                                <button
                                  onClick={() => deleteUser(u.id)}
                                  className="px-3 py-1.5 bg-red-600/10 text-red-400 hover:bg-red-600/20 border border-red-500/20 rounded-lg text-[11px] font-bold transition-all inline-flex items-center space-x-1 font-title"
                                  title="Eliminar usuario permanentemente"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Eliminar</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center bg-card/25 p-4 rounded-2xl border border-card-border/50 font-title mt-4">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => fetchUsers(userSearch, currentPage - 1)}
                    className="px-4 py-2 bg-card hover:bg-card-border/40 disabled:opacity-40 disabled:cursor-not-allowed border border-card-border text-gray-300 font-bold rounded-xl text-xs transition-all uppercase tracking-wider"
                  >
                    Anterior
                  </button>
                  <span className="text-xs text-gray-400 font-medium font-sans">
                    Página <span className="text-accent font-bold">{currentPage}</span> de <span className="text-gray-200 font-bold">{totalPages}</span>
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => fetchUsers(userSearch, currentPage + 1)}
                    className="px-4 py-2 bg-card hover:bg-card-border/40 disabled:opacity-40 disabled:cursor-not-allowed border border-card-border text-gray-300 font-bold rounded-xl text-xs transition-all uppercase tracking-wider"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PHASES MANAGEMENT */}
          {activeTab === 'phases' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-gray-100 font-title">Gestión de Fases</h3>
                <button
                  onClick={() => {
                    setIsEditingPhase(false);
                    setPhaseForm({ id: '', name: '', openAt: '', closeAt: '', status: 'LOCKED' });
                    setShowPhaseModal(true);
                  }}
                  className="px-4 py-2 bg-accent hover:bg-accent/90 text-background font-bold text-xs rounded-xl transition-all flex items-center space-x-1 shadow-md shadow-accent/10 font-title"
                >
                  <Plus className="h-4 w-4" />
                  <span>Crear Fase</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {phases.map((phase) => (
                  <div key={phase.id} className="glass-card p-5 rounded-2xl border border-card-border flex flex-col justify-between h-40">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-gray-100 font-title">{phase.name}</h4>
                        <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider mt-1 font-title ${
                          phase.status === 'OPEN'
                            ? 'bg-accent/10 text-accent border border-accent/20'
                            : phase.status === 'CLOSED'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}>
                          {phase.status === 'OPEN' ? 'Abierta' : phase.status === 'CLOSED' ? 'Cerrada' : 'Bloqueada'}
                        </span>
                      </div>
                      
                      <div className="flex space-x-1">
                        <button
                          onClick={() => {
                            setIsEditingPhase(true);
                            setPhaseForm({
                              id: phase.id,
                              name: phase.name,
                              openAt: toLocalISOString(phase.openAt),
                              closeAt: toLocalISOString(phase.closeAt),
                              status: phase.status
                            });
                            setShowPhaseModal(true);
                          }}
                          className="p-2 hover:bg-card-border/50 text-accent hover:text-accent/90 rounded-lg border border-card-border transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deletePhase(phase.id)}
                          className="p-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-lg border border-red-500/10 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-card-border/50 pt-3 flex justify-between items-center text-[10px] text-gray-400 font-sans">
                      <div>
                        <span className="block">Apertura: {new Date(phase.openAt).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="block mt-0.5">Cierre: {new Date(phase.closeAt).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="text-right font-title">
                        <span className="block font-bold text-gray-200">
                          {phase._count?.matches === 1 ? '1 partido' : `${phase._count?.matches || 0} partidos`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MATCHES MANAGEMENT */}
          {activeTab === 'matches' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-gray-100 font-title">Gestión de Partidos</h3>
                <button
                  onClick={() => {
                    setIsEditingMatch(false);
                    setMatchForm({ id: '', homeTeam: '', awayTeam: '', matchDate: '', phaseId: phases[0]?.id || '' });
                    setShowMatchModal(true);
                  }}
                  className="px-4 py-2 bg-accent hover:bg-accent/90 text-background font-bold text-xs rounded-xl transition-all flex items-center space-x-1 shadow-md shadow-accent/10 font-title"
                >
                  <Plus className="h-4 w-4" />
                  <span>Crear Partido</span>
                </button>
              </div>

              <div className="glass-panel rounded-2xl border border-card-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-background/80 border-b border-card-border text-gray-400 font-bold uppercase tracking-wider font-title text-[10px]">
                      <tr>
                        <th className="p-4">Equipos</th>
                        <th className="p-4">Fecha</th>
                        <th className="p-4">Fase</th>
                        <th className="p-4">Estado</th>
                        <th className="p-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border/40 font-semibold text-gray-200">
                      {matches.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-gray-500">
                            Ningún partido registrado. Crea uno arriba.
                          </td>
                        </tr>
                      ) : (
                        matches.map((m) => (
                          <tr key={m.id} className="hover:bg-card-border/10">
                            <td className="p-4 font-bold text-gray-100 font-title uppercase tracking-tight">
                              {m.homeTeam} VS {m.awayTeam}
                            </td>
                            <td className="p-4 text-gray-400">
                              {new Date(m.matchDate).toLocaleString('es-ES', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </td>
                            <td className="p-4">
                              <span className="bg-accent/10 border border-accent/25 px-2 py-0.5 text-[10px] rounded-lg text-accent font-title font-bold">
                                {m.phase.name}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-title ${
                                m.status === 'PLAYED'
                                  ? 'bg-accent/10 text-accent border border-accent/20'
                                  : 'bg-gold/10 text-gold border border-gold/20'
                              }`}>
                                {m.status === 'PLAYED' ? 'Jugado' : 'Pendiente'}
                              </span>
                            </td>
                            <td className="p-4 text-right flex justify-end space-x-1">
                              <button
                                onClick={() => {
                                  setIsEditingMatch(true);
                                  setMatchForm({
                                    id: m.id,
                                    homeTeam: m.homeTeam,
                                    awayTeam: m.awayTeam,
                                    matchDate: toLocalISOString(m.matchDate),
                                    phaseId: m.phaseId
                                  });
                                  setShowMatchModal(true);
                                }}
                                className="p-2 hover:bg-card-border/50 text-accent rounded-lg border border-card-border transition-colors"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => deleteMatch(m.id)}
                                className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg border border-red-500/10 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CARGAR RESULTADOS */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              <h3 className="text-lg font-black text-gray-100 font-title">Cargar Resultados</h3>
              
              <div className="space-y-8">
                {phases.map((phase) => {
                  const phaseMatches = matches.filter(m => m.phaseId === phase.id);
                  if (phaseMatches.length === 0) return null;

                  return (
                    <div key={phase.id} className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-accent bg-accent/10 px-3 py-1.5 rounded-xl border border-accent/20 inline-block font-title">
                        {phase.name}
                      </h4>
                      <div className="space-y-4">
                        {phaseMatches.map((m) => {
                          const input = scoresInput[m.id] || { home: '', away: '' };

                          return (
                            <div key={m.id} className="glass-card p-5 rounded-2xl border border-card-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/30 hover:translate-x-1 duration-200">
                              
                              {/* Teams display */}
                              <div className="flex-1 grid grid-cols-7 items-center gap-2">
                                <div className="col-span-3 text-right font-black text-gray-100 text-sm truncate font-title uppercase tracking-tight">{m.homeTeam}</div>
                                <div className="col-span-1 text-center font-black text-xs text-gray-500 font-title">VS</div>
                                <div className="col-span-3 text-left font-black text-gray-100 text-sm truncate font-title uppercase tracking-tight">{m.awayTeam}</div>
                              </div>

                              {/* Admin Score Register inputs */}
                              <div className="flex items-center gap-3 justify-end min-w-[220px]">
                                
                                <div className="flex items-center space-x-1.5 bg-[#020906] p-1 rounded-xl border border-card-border/60">
                                  <input
                                    type="text"
                                    placeholder="-"
                                    value={input.home}
                                    onChange={(e) => handleScoreChange(m.id, 'home', e.target.value)}
                                    className="w-10 h-10 bg-card border border-card-border text-center rounded-lg text-base font-black text-gold focus:outline-none focus:border-gold font-title"
                                  />
                                  <span className="text-gray-500 font-bold font-title">-</span>
                                  <input
                                    type="text"
                                    placeholder="-"
                                    value={input.away}
                                    onChange={(e) => handleScoreChange(m.id, 'away', e.target.value)}
                                    className="w-10 h-10 bg-card border border-card-border text-center rounded-lg text-base font-black text-gold focus:outline-none focus:border-gold font-title"
                                  />
                                </div>

                                {/* Save / Reset buttons */}
                                <div className="flex space-x-1 shrink-0 font-title">
                                  <button
                                    onClick={() => saveMatchScore(m.id)}
                                    className="px-3.5 py-2.5 bg-accent hover:bg-accent/90 text-background font-bold rounded-xl text-xs flex items-center space-x-1 transition-all uppercase tracking-wider text-[10px]"
                                  >
                                    <Save className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Guardar</span>
                                  </button>
                                  
                                  {m.status === 'PLAYED' && (
                                    <button
                                      onClick={() => resetMatchScore(m.id)}
                                      className="p-2.5 hover:bg-red-500/10 text-red-400 border border-red-500/10 rounded-xl transition-colors"
                                      title="Reiniciar Marcador"
                                    >
                                      <RefreshCw className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* PHASE MODAL */}
      {showPhaseModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl relative animate-in fade-in zoom-in-95 duration-200 border border-card-border bg-[#04110a]">
            <h3 className="text-lg font-black text-gray-100 flex items-center space-x-2 font-title">
              <Calendar className="h-5 w-5 text-accent" />
              <span>{isEditingPhase ? 'Editar Fase' : 'Crear Nueva Fase'}</span>
            </h3>

            <form onSubmit={handlePhaseSubmit} className="space-y-4 mt-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider font-title">Nombre de la Fase</label>
                <input
                  type="text"
                  required
                  value={phaseForm.name}
                  onChange={(e) => setPhaseForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-background border border-card-border focus:border-accent rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-100 outline-none transition-colors font-sans"
                  placeholder="Ej. Octavos de Final"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider font-title">Fecha y Hora de Apertura</label>
                <input
                  type="datetime-local"
                  required
                  value={phaseForm.openAt}
                  onChange={(e) => setPhaseForm(prev => ({ ...prev, openAt: e.target.value }))}
                  className="w-full bg-background border border-card-border focus:border-accent rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-100 outline-none transition-colors font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider font-title">Fecha y Hora de Cierre</label>
                <input
                  type="datetime-local"
                  required
                  value={phaseForm.closeAt}
                  onChange={(e) => setPhaseForm(prev => ({ ...prev, closeAt: e.target.value }))}
                  className="w-full bg-background border border-card-border focus:border-accent rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-100 outline-none transition-colors font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider font-title">Estado</label>
                <select
                  value={phaseForm.status}
                  onChange={(e) => setPhaseForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-background border border-card-border focus:border-accent rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-100 outline-none transition-colors font-title"
                >
                  <option value="LOCKED">Bloqueada</option>
                  <option value="OPEN">Abierta</option>
                  <option value="CLOSED">Cerrada</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-2 font-title">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-accent hover:bg-accent/90 text-background font-black rounded-xl shadow-lg transition-all uppercase tracking-wider text-xs"
                >
                  {isEditingPhase ? 'Actualizar' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPhaseModal(false)}
                  className="flex-1 py-3 bg-card hover:bg-card-border/30 text-gray-300 border border-card-border font-bold rounded-xl transition-all uppercase tracking-wider text-xs"
                >
                  Cancelar
                </button>
              </div>
            </form>

            <button
              onClick={() => setShowPhaseModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 text-sm font-bold p-1 hover:bg-card-border/30 rounded-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* MATCH MODAL */}
      {showMatchModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl relative animate-in fade-in zoom-in-95 duration-200 border border-card-border bg-[#04110a]">
            <h3 className="text-lg font-black text-gray-100 flex items-center space-x-2 font-title">
              <Play className="h-5 w-5 text-accent" />
              <span>{isEditingMatch ? 'Editar Partido' : 'Crear Nuevo Partido'}</span>
            </h3>

            <form onSubmit={handleMatchSubmit} className="space-y-4 mt-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider font-title">Equipo Local</label>
                <input
                  type="text"
                  required
                  value={matchForm.homeTeam}
                  onChange={(e) => setMatchForm(prev => ({ ...prev, homeTeam: e.target.value }))}
                  className="w-full bg-background border border-card-border focus:border-accent rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-100 outline-none transition-colors font-sans"
                  placeholder="Ej. España"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider font-title">Equipo Visitante</label>
                <input
                  type="text"
                  required
                  value={matchForm.awayTeam}
                  onChange={(e) => setMatchForm(prev => ({ ...prev, awayTeam: e.target.value }))}
                  className="w-full bg-background border border-card-border focus:border-accent rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-100 outline-none transition-colors font-sans"
                  placeholder="Ej. Alemania"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider font-title">Fecha y Hora del Partido</label>
                <input
                  type="datetime-local"
                  required
                  value={matchForm.matchDate}
                  onChange={(e) => setMatchForm(prev => ({ ...prev, matchDate: e.target.value }))}
                  className="w-full bg-background border border-card-border focus:border-accent rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-100 outline-none transition-colors font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider font-title">Asignar a Fase</label>
                <select
                  required
                  value={matchForm.phaseId}
                  onChange={(e) => setMatchForm(prev => ({ ...prev, phaseId: e.target.value }))}
                  className="w-full bg-background border border-card-border focus:border-accent rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-100 outline-none transition-colors font-title"
                >
                  <option value="" disabled>Seleccione una fase...</option>
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-2 pt-2 font-title">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-accent hover:bg-accent/90 text-background font-black rounded-xl shadow-lg transition-all uppercase tracking-wider text-xs"
                >
                  {isEditingMatch ? 'Actualizar' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMatchModal(false)}
                  className="flex-1 py-3 bg-card hover:bg-card-border/30 text-gray-300 border border-card-border font-bold rounded-xl transition-all uppercase tracking-wider text-xs"
                >
                  Cancelar
                </button>
              </div>
            </form>

            <button
              onClick={() => setShowMatchModal(false)}
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
