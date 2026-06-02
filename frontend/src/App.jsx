import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell
} from 'recharts';
import {
  Activity, Heart, Shield, Stethoscope, Users, LogOut, Brain,
  TrendingUp, AlertTriangle, CheckCircle2, Clock, FileText,
  MessageSquare, Home, Settings, Bell, Search, ChevronRight,
  Lock, Mail, User as UserIcon, Eye, EyeOff, Calendar, Plus,
  Sparkles, Database, Cpu, Zap, Award,
  X, Key, Bot, Send, Trash2, Info,
  Check, Loader2, RefreshCw, Save, GraduationCap, Network,
  Edit3, ExternalLink, BarChart3, PieChart as PieIcon
} from 'lucide-react';

// ====================== API КЛИЕНТ ======================
const API = {
  getToken: () => localStorage.getItem('access_token'),
  setToken: (token) => {
    localStorage.setItem('access_token', token);
    console.log('✅ Токен сохранен:', token.substring(0, 20) + '...');
  },
  setUser: (user) => localStorage.setItem('user', JSON.stringify(user)),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  },
  clear: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },

  async request(url, options = {}) {
    const token = this.getToken();
    console.log(`🌐 Запрос к ${url}, токен:`, token ? 'ПРИСУТСТВУЕТ' : 'ОТСУТСТВУЕТ');
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };
    
    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401) {
      console.warn('⚠️ Токен недействителен, выходим из системы');
      this.clear();
      window.location.reload();
      throw new Error('Unauthorized');
    }
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${response.status}`);
    }
    return response.json();
  },

  login: (email, password) => API.request('/api/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password })
  }),
  register: (data) => API.request('/api/auth/register', {
    method: 'POST', body: JSON.stringify(data)
  }),
  getMyIndicators: () => API.request('/api/indicators/patient/latest'),
  updateIndicators: (updates) => API.request('/api/indicators/update', {
    method: 'POST', body: JSON.stringify(updates)
  }),
  getPatients: () => API.request('/api/patients/'),
  createPatient: (data) => API.request('/api/patients/', {
    method: 'POST', body: JSON.stringify(data)
  }),
  deletePatient: (id) => API.request(`/api/patients/${id}`, { method: 'DELETE' }),
  getMLModels: () => API.request('/api/ml-models/'),
  runAnalysis: (data) => API.request('/api/analyses/run', {
    method: 'POST', body: JSON.stringify(data)
  }),
  sendChat: (data) => API.request('/api/chat/', {
    method: 'POST', body: JSON.stringify(data)
  }),
  getUsers: () => API.request('/api/users/'),
};

// ====================== УНИКАЛЬНЫЙ ЧАТ ДЛЯ КАЖДОГО ПОЛЬЗОВАТЕЛЯ ======================
const getChatKey = (userId) => `chat_history_${userId}`;

const loadChatHistory = (userId) => {
  try {
    const saved = localStorage.getItem(getChatKey(userId));
    if (saved) return JSON.parse(saved);
  } catch { }
  return [{ from: 'ai', text: 'Здравствуйте! Я **Healix AI**.\n\nСообщайте показатели в чате — они автоматически сохранятся в системе:\n- "пульс 80"\n- "глюкоза 6.0"\n- "давление 140/90"', ts: Date.now() }];
};

const saveChatHistory = (userId, history) => {
  try { localStorage.setItem(getChatKey(userId), JSON.stringify(history)); } catch { }
};

// ====================== ПАРСЕР ПОКАЗАТЕЛЕЙ ======================
const parseIndicatorsFromText = (text) => {
  if (!text) return [];
  const t = text.toLowerCase();
  const updates = [];
  const gluMatch = t.match(/(?:глюкоз[аы]|сахар)\s*[:-]?\s*(\d+[.,]\d)/);
  if (gluMatch) updates.push({ code: 'GLU', value: parseFloat(gluMatch[1].replace(',', '.')) });
  const bpMatch = t.match(/(?:давлени[еяю]|ад)\s*[:-]?\s*(\d{2,3})\s*[/на\s]+\s*(\d{2,3})/);
  if (bpMatch) {
    updates.push({ code: 'SBP', value: parseInt(bpMatch[1]) });
    updates.push({ code: 'DBP', value: parseInt(bpMatch[2]) });
  }
  const hrMatch = t.match(/(?:пульс|чсс)\s*[:-]?\s*(\d{2,3})/);
  if (hrMatch) updates.push({ code: 'HR', value: parseInt(hrMatch[1]) });
  return updates.filter(u => !isNaN(u.value));
};

// ====================== ДЕМО-ДАННЫЕ ======================
const TREND_DATA = [
  { day: '01.05', sbp: 128, dbp: 82, hr: 72, glu: 5.4 },
  { day: '08.05', sbp: 132, dbp: 85, hr: 78, glu: 5.8 },
  { day: '15.05', sbp: 125, dbp: 80, hr: 70, glu: 5.2 },
  { day: '22.05', sbp: 138, dbp: 88, hr: 82, glu: 6.1 },
  { day: '29.05', sbp: 130, dbp: 84, hr: 75, glu: 5.6 },
  { day: '05.06', sbp: 126, dbp: 81, hr: 71, glu: 5.3 },
];
const RADAR_DATA = [
  { metric: 'Сердце', value: 78 }, { metric: 'Метаболизм', value: 65 },
  { metric: 'Дыхание', value: 92 }, { metric: 'Почки', value: 84 },
  { metric: 'Иммунитет', value: 71 }, { metric: 'Сон', value: 58 },
];

// ====================== UI КОМПОНЕНТЫ ======================
const Logo = ({ size = 32 }) => (
  <div className="flex items-center gap-2.5">
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-700 rounded-lg rotate-3 shadow-lg shadow-red-500/40" />
      <div className="absolute inset-0 bg-zinc-950 rounded-lg flex items-center justify-center">
        <Heart className="text-red-500" size={size * 0.55} strokeWidth={2.5} fill="currentColor" />
      </div>
    </div>
    <div className="flex flex-col leading-tight">
      <span className="font-bold text-white tracking-tight" style={{ fontSize: size * 0.55 }}>Healix</span>
      <span className="text-[10px] text-zinc-500 font-mono">AI Health Platform</span>
    </div>
  </div>
);

const Badge = ({ children, color = 'red' }) => {
  const map = {
    red: 'bg-red-500/15 text-red-400 border-red-500/30',
    green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    zinc: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/50',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${map[color]}`}>{children}</span>;
};

const Button = ({ children, variant = 'primary', className = '', onClick, type, disabled }) => {
  const base = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';
  const styles = {
    primary: 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:shadow-lg hover:shadow-red-500/30',
    ghost: 'bg-zinc-800/60 text-zinc-200 hover:bg-zinc-700/80 border border-zinc-700',
    outline: 'border border-red-500/40 text-red-400 hover:bg-red-500/10',
  };
  return <button type={type || 'button'} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>{children}</button>;
};

const StatCard = ({ icon: Icon, label, value, delta, color = 'red', highlight = false }) => (
  <motion.div whileHover={{ y: -2 }}
    className={`bg-zinc-900/70 border rounded-2xl p-5 transition-all ${highlight ? 'border-red-500 ring-2 ring-red-500/40' : 'border-zinc-800 hover:border-red-500/40'}`}>
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color}-500/10 border border-${color}-500/20`}>
        <Icon className={`text-${color}-400`} size={18} />
      </div>
      {delta && <span className={`text-xs font-mono ${delta.startsWith('-') ? 'text-red-400' : 'text-emerald-400'}`}>{delta}</span>}
    </div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    <div className="text-xs text-zinc-500">{label}</div>
  </motion.div>
);

const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          onClick={e => e.stopPropagation()}
          className={`w-full ${sizes[size]} bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col`}>
          <div className="flex items-center justify-between p-5 border-b border-zinc-800">
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400">
              <X size={16} />
            </button>
          </div>
          <div className="p-5 overflow-y-auto flex-1">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ====================== ЭКРАН АВТОРИЗАЦИИ ======================
const AuthScreen = ({ onLogin }) => {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('patient');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);
        try {
        if (mode === 'login') {
            // === ВХОД В СИСТЕМУ ===
            const response = await API.login(email, pass);
            API.setToken(response.access_token);
            API.setUser({
            id: response.user_id,
            email,
            full_name: response.full_name,
            role: response.role,
            avatar: response.full_name.split(' ').map(n => n[0]).join('').slice(0, 2),
            });
            onLogin();
        } else {
            // === РЕГИСТРАЦИЯ (без автоматического входа) ===
            await API.register({
            email, password: pass, full_name: name,
            role, birth_date: '1990-01-01',
            });
            
            // Показываем уведомление об успехе
            setSuccessMsg('✅ Регистрация успешна! Теперь войдите в систему.');
            // Переключаемся на вкладку "Вход"
            setMode('login');
            // Сбрасываем пароль, но оставляем email заполненным
            setPass('');
            setName('');
        }
        } catch (err) {
        setError(err.message);
        } finally {
        setLoading(false);
        }
    };

  const quickLogin = async (e, p) => {
    try {
      const r = await API.login(e, p);
      API.setToken(r.access_token);
      API.setUser({
        id: r.user_id, email: e, full_name: r.full_name, role: r.role,
        avatar: r.full_name.split(' ').map(n => n[0]).join('').slice(0, 2),
      });
      onLogin();
    } catch (err) {
      setError(`Ошибка демо-входа: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 relative overflow-hidden flex">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-red-600/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-red-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="hidden lg:flex lg:w-[55%] relative p-12 flex-col justify-between">
        <Logo size={40} />
        <div className="relative z-10">
          <Badge color="red"><Sparkles size={10} /> Powered by Healix AI</Badge>
          <h1 className="text-5xl xl:text-6xl font-bold text-white mt-6 leading-[1.1] tracking-tight">
            Персональный<br />
            <span className="bg-gradient-to-r from-red-400 via-red-500 to-red-700 bg-clip-text text-transparent">анализ здоровья</span><br />
            на основе ИИ
          </h1>
          <p className="text-zinc-400 mt-6 text-lg max-w-lg leading-relaxed">
            Информационная система мониторинга медицинских показателей с применением методов машинного обучения.
            PostgreSQL · FastAPI · React · Healix AI.
          </p>
        </div>
        <div className="text-xs text-zinc-500 flex items-center gap-3">
          <span>© 2026 Healix</span>•<span>Дипломный проект</span>•<span className="font-mono">v1.0.0</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl">
          <div className="lg:hidden mb-6"><Logo /></div>

          <div className="flex bg-zinc-950/60 rounded-xl p-1 mb-8 border border-zinc-800">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setSuccessMsg(''); setError(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === m ? 'bg-red-600 text-white' : 'text-zinc-400'}`}>
                {m === 'login' ? 'Вход' : 'Регистрация'}
              </button>
            ))}
          </div>

        {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
            {error}
        </div>
        )}

        {successMsg && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm text-emerald-400 flex items-center gap-2">
            <CheckCircle2 size={16} />
            {successMsg}
        </div>
        )}
          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">ФИО</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Иванов Иван"
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50" />
              </div>
            )}
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="patient@med.ru"
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Пароль</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50" />
            </div>

            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : (mode === 'login' ? 'Войти' : 'Создать')}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800" /><span className="text-xs text-zinc-600">демо-вход</span><div className="flex-1 h-px bg-zinc-800" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => quickLogin('patient@med.ru', 'password123')} className="text-xs py-2.5 rounded-lg bg-zinc-800/40 hover:bg-zinc-800 text-zinc-300 border border-zinc-800">👤 Пациент</button>
            <button onClick={() => quickLogin('doctor@med.ru', 'password123')} className="text-xs py-2.5 rounded-lg bg-zinc-800/40 hover:bg-zinc-800 text-zinc-300 border border-zinc-800">🩺 Врач</button>
            <button onClick={() => quickLogin('admin@med.ru', 'password123')} className="text-xs py-2.5 rounded-lg bg-zinc-800/40 hover:bg-zinc-800 text-zinc-300 border border-zinc-800">⚙️ Админ</button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ====================== ДАШБОРД ПАЦИЕНТА ======================
const PatientDashboard = ({ setPage, indicators, recentUpdates }) => (
  <div>
    <header className="flex items-center justify-between pb-6 border-b border-zinc-800/60 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Добрый день!</h1>
        <p className="text-sm text-zinc-500 mt-1">Данные из PostgreSQL через Healix AI</p>
      </div>
      <Badge color="red"><Sparkles size={10} /> Healix AI</Badge>
    </header>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <StatCard icon={Heart} label="Систолическое АД" value={`${indicators.find(i => i.code === 'SBP')?.value || '—'} мм рт.ст.`} />
      <StatCard icon={Activity} label="Пульс" value={`${indicators.find(i => i.code === 'HR')?.value || '—'} уд/мин`} />
      <StatCard icon={Zap} label="Глюкоза" value={`${indicators.find(i => i.code === 'GLU')?.value || '—'} ммоль/л`} />
      <StatCard icon={AlertTriangle} label="Отклонений" value={indicators.filter(i => i.status === 'warning').length} />
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
      <div className="xl:col-span-2 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white font-semibold">Динамика показателей</h3>
            <p className="text-xs text-zinc-500">Последние 6 измерений</p>
          </div>
          <Badge color="red"><Sparkles size={10} /> Healix AI прогноз</Badge>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={TREND_DATA}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke="#52525b" fontSize={11} />
            <YAxis stroke="#52525b" fontSize={11} />
            <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12 }} />
            <Area type="monotone" dataKey="sbp" stroke="#ef4444" strokeWidth={2} fill="url(#g1)" name="Систолическое" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Общая оценка Healix AI</h3>
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={RADAR_DATA}>
            <PolarGrid stroke="#3f3f46" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
            <Radar name="Здоровье" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.35} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Быстрые действия</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setPage('ml-analysis')} className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl hover:border-red-500/30 transition-colors text-left">
            <Brain className="text-red-400 mb-2" size={20} />
            <div className="text-white text-sm font-semibold">Healix AI Анализ</div>
            <div className="text-xs text-zinc-500">Прогноз рисков</div>
          </button>
          <button onClick={() => setPage('chat')} className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl hover:border-red-500/30 transition-colors text-left">
            <MessageSquare className="text-red-400 mb-2" size={20} />
            <div className="text-white text-sm font-semibold">Healix AI Ассистент</div>
            <div className="text-xs text-zinc-500">Диалог с ИИ</div>
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Текущие показатели</h3>
        <div className="space-y-2">
          {indicators.map(ind => (
            <div key={ind.code} className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/40 border border-zinc-800">
              <div>
                <div className="text-xs text-zinc-500 font-mono">{ind.code}</div>
                <div className="text-white text-sm">{ind.name}</div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold">{ind.value}</div>
                <div className="text-[10px] text-zinc-500">{ind.unit}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ====================== ML-АНАЛИЗ ======================
const MLAnalysisPage = ({ user, indicators }) => {
  const [models, setModels] = useState([]);
  const [running, setRunning] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    API.getMLModels().then(setModels).catch(() => {});
  }, []);

  const runAnalysis = async (modelName) => {
    setRunning(modelName);
    try {
      const res = await API.runAnalysis({ model_name: modelName, patient_id: user.id });
      setResult({ model: "Healix AI", ...res });
    } catch (err) {
      setResult({ model: "Healix AI", error: err.message });
    } finally {
      setRunning(null);
    }
  };

  return (
    <div>
      <header className="flex items-center justify-between pb-6 border-b border-zinc-800/60 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Healix AI Анализ рисков</h1>
          <p className="text-sm text-zinc-500 mt-1">Прогнозирование на основе собственной модели Healix AI</p>
        </div>
        <Badge color="red"><Cpu size={10} /> Healix AI Core</Badge>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {models.map((m) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <Cpu className="text-red-400" size={18} />
              </div>
              <Badge color="green"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />online</Badge>
            </div>
            <h3 className="text-white font-semibold">Healix AI: {m.name.replace('CardioRiskPredictor', 'Кардио').replace('DiabetesScreening', 'Диабет').replace('GeneralHealthScore', 'Общий скоринг')}</h3>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">v{m.version} · {m.algorithm}</p>
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase">Accuracy</div>
              <div className="text-xl font-bold text-white">{(m.accuracy * 100).toFixed(1)}%</div>
            </div>
            <Button onClick={() => runAnalysis(m.name)} disabled={running === m.name} className="w-full mt-4">
              {running === m.name ? <><Loader2 size={14} className="animate-spin" />Анализ...</> : <><Brain size={14} />Запустить Healix AI</>}
            </Button>
          </motion.div>
        ))}
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-red-950/30 to-zinc-900 border border-red-500/30 rounded-2xl p-6 mb-6">
          <h3 className="text-white font-bold text-lg mb-2">Результат анализа Healix AI</h3>
          {result.error ? (
            <div className="text-red-400">Ошибка: {result.error}</div>
          ) : (
            <div>
              <div className="flex items-center gap-6 mb-4">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="#27272a" strokeWidth="10" fill="none" />
                    <circle cx="64" cy="64" r="56" stroke="#ef4444" strokeWidth="10" fill="none"
                      strokeDasharray={2 * Math.PI * 56}
                      strokeDashoffset={2 * Math.PI * 56 * (1 - result.risk_score)}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-3xl font-bold text-white">{(result.risk_score * 100).toFixed(1)}%</div>
                    <div className="text-[10px] text-zinc-500 uppercase">риск</div>
                  </div>
                </div>
                <div>
                  <div className="text-white font-bold mb-1">
                    Уровень: <span className={result.risk_level === 'low' ? 'text-emerald-400' : result.risk_level === 'medium' ? 'text-amber-400' : 'text-red-400'}>
                      {result.risk_level === 'low' ? 'Низкий' : result.risk_level === 'medium' ? 'Средний' : 'Высокий'}
                    </span>
                  </div>
                </div>
              </div>
              {result.recommendations?.length > 0 && (
                <div>
                  <div className="text-sm text-zinc-400 mb-2">Рекомендации Healix AI:</div>
                  <ul className="space-y-1">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                        <CheckCircle2 size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

// ====================== ЧАТ ======================
const ChatPage = ({ user, indicators, onIndicatorsUpdate }) => {
  const [chatHistory, setChatHistory] = useState(() => loadChatHistory(user.id));
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { saveChatHistory(user.id, chatHistory); }, [chatHistory, user.id]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [chatHistory, typing]);

  const send = async () => {
    if (!input.trim() || typing) return;
    const userText = input;
    setChatHistory(h => [...h, { from: 'user', text: userText, ts: Date.now() }]);
    setInput('');
    setTyping(true);
    try {
      const history = chatHistory.slice(-10).map(m => ({
        role: m.from === 'user' ? 'user' : 'assistant', content: m.text,
      }));
      const response = await API.sendChat({ message: userText, history });
      if (response.indicators_updated?.length > 0) {
        const updates = response.indicators_updated.map(i => ({ code: i.code, value: i.value }));
        await API.updateIndicators(updates);
        onIndicatorsUpdate(response.indicators_updated);
      }
      const clientParsed = parseIndicatorsFromText(userText);
      if (clientParsed.length > 0) {
        const newCodes = clientParsed.filter(c => !response.indicators_updated?.some(r => r.code === c.code));
        if (newCodes.length > 0) {
          await API.updateIndicators(newCodes);
          onIndicatorsUpdate(newCodes);
        }
      }
      setChatHistory(h => [...h, { from: 'ai', text: response.reply, ts: Date.now(), model: response.model }]);
    } catch (err) {
      setChatHistory(h => [...h, { from: 'ai', text: `⚠️ Ошибка: ${err.message}`, ts: Date.now() }]);
    } finally {
      setTyping(false);
    }
  };

  const clearHistory = () => {
    if (confirm('Очистить историю чата?')) {
      setChatHistory([{ from: 'ai', text: 'История очищена.', ts: Date.now() }]);
    }
  };

  const MarkdownLite = ({ text }) => {
    if (!text) return null;
    const lines = text.split('\n');
    return (
      <div className="space-y-1">
        {lines.map((line, i) => {
          const parts = [];
          let key = 0;
          // 👇 ВОТ ЭТА СТРОКА ДОЛЖНА БЫТЬ ИМЕННО ТАКОЙ (со слешами):
          const regex = /\*\*([^*]+)\*\*/g; 
          let lastIndex = 0;
          let match;
          while ((match = regex.exec(line)) !== null) {
            if (match.index > lastIndex) parts.push(<span key={key++}>{line.slice(lastIndex, match.index)}</span>);
            parts.push(<strong key={key++} className="font-bold text-white">{match[1]}</strong>);
            lastIndex = regex.lastIndex;
          }
          if (lastIndex < line.length) parts.push(<span key={key++}>{line.slice(lastIndex)}</span>);
          if (parts.length === 0) parts.push(<span key={key++}>{line}</span>);
          if (line.trim() === '') return <div key={i} className="h-2" />;
          return <div key={i}>{parts}</div>;
        })}
      </div>
    );
  };

  return (
    <div>
      <header className="flex items-center justify-between pb-6 border-b border-zinc-800/60 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Healix AI Ассистент</h1>
          <p className="text-sm text-zinc-500 mt-1">Уникальный чат для {user.full_name}</p>
        </div>
        <Badge color="red"><GraduationCap size={10} /> Healix AI</Badge>
      </header>

      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
        <div className="px-5 py-3 border-b border-zinc-800 flex items-center gap-3 bg-zinc-950/40">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
            <GraduationCap className="text-white" size={18} />
          </div>
          <div className="flex-1">
            <div className="text-white font-semibold text-sm">Healix AI</div>
            <div className="text-xs text-emerald-400">онлайн · Healix AI Core</div>
          </div>
          <button onClick={clearHistory} className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400">
            <Trash2 size={14} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {chatHistory.map((m, i) => (
            <motion.div key={m.ts || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${m.from === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold ${m.from === 'user' ? 'bg-zinc-700 text-white' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                {m.from === 'user' ? user.avatar?.[0] || 'П' : <Brain size={14} />}
              </div>
              <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.from === 'user' ? 'bg-gradient-to-br from-red-600 to-red-700 text-white rounded-tr-sm' : 'bg-zinc-800 text-zinc-100 rounded-tl-sm border border-zinc-700'}`}>
                <MarkdownLite text={m.text} />
              </div>
            </motion.div>
          ))}
          {typing && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <Brain className="text-red-400" size={14} />
              </div>
              <div className="bg-zinc-800 px-4 py-3 rounded-2xl border border-zinc-700 flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} className="w-2 h-2 rounded-full bg-red-400" />)}
                </div>
                <span className="text-xs text-zinc-500">Healix AI анализирует...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-950/40">
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder='Сообщите показатель (например: "пульс 80")...'
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50" />
            <Button onClick={send} disabled={!input.trim() || typing}><Send size={14} /></Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ====================== ПАНЕЛЬ ВРАЧА ======================
const DoctorDashboard = ({ patients, onAddPatientClick, onDeletePatient }) => {
  const [search, setSearch] = useState('');
  const filtered = patients.filter(p => p.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <header className="flex items-center justify-between pb-6 border-b border-zinc-800/60 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Панель врача</h1>
          <p className="text-sm text-zinc-500 mt-1">Управление пациентами из БД</p>
        </div>
        <Button onClick={onAddPatientClick}><Plus size={14} /> Добавить пациента</Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Всего пациентов" value={patients.length} />
        <StatCard icon={Stethoscope} label="Консультаций сегодня" value="7" />
        <StatCard icon={AlertTriangle} label="Высокий риск" value={patients.filter(p => p.risk_level === 'high' || p.risk_level === 'critical').length} color="red" />
        <StatCard icon={Award} label="Ваш рейтинг" value="4.87" delta="★" />
      </div>

      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по ФИО..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/40" />
          </div>
          <Badge color="zinc">{filtered.length} из {patients.length}</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-3 px-2 font-medium">Пациент</th>
                <th className="text-left py-3 px-2 font-medium">Возраст</th>
                <th className="text-left py-3 px-2 font-medium">Диагноз</th>
                <th className="text-left py-3 px-2 font-medium">Риск</th>
                <th className="text-left py-3 px-2 font-medium">Score</th>
                <th className="text-right py-3 px-2 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-950/40">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold text-xs">
                        {p.full_name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{p.full_name}</div>
                        <div className="text-xs text-zinc-500">{p.gender === 'male' ? 'М' : 'Ж'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-zinc-300">{p.age} лет</td>
                  <td className="py-3 px-2 text-zinc-400 text-xs">{p.diagnosis || '—'}</td>
                  <td className="py-3 px-2">
                    <Badge color={p.risk_level === 'high' ? 'red' : p.risk_level === 'medium' ? 'amber' : 'green'}>
                      {p.risk_level}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-white font-bold">{p.health_score}</td>
                  <td className="py-3 px-2 text-right">
                    <button onClick={() => { if (confirm(`Удалить пациента ${p.full_name}?`)) onDeletePatient(p.id); }}
                      className="text-zinc-500 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ====================== АДМИН-ПАНЕЛЬ ======================
const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.getUsers().then(data => { setUsers(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const stats = {
    total: users.length,
    patients: users.filter(u => u.role === 'patient').length,
    doctors: users.filter(u => u.role === 'doctor').length,
    admins: users.filter(u => u.role === 'admin').length,
  };

  const roleData = [
    { name: 'Пациенты', value: stats.patients, color: '#ef4444' },
    { name: 'Врачи', value: stats.doctors, color: '#f87171' },
    { name: 'Админы', value: stats.admins, color: '#7f1d1d' },
  ];

  return (
    <div>
      <header className="flex items-center justify-between pb-6 border-b border-zinc-800/60 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Админ-панель</h1>
          <p className="text-sm text-zinc-500 mt-1">Управление системой Healix</p>
        </div>
        <Badge color="red"><Shield size={10} /> Admin</Badge>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Всего пользователей" value={stats.total} delta="+12%" />
        <StatCard icon={UserIcon} label="Пациентов" value={stats.patients} />
        <StatCard icon={Stethoscope} label="Врачей" value={stats.doctors} color="red" />
        <StatCard icon={Shield} label="Администраторов" value={stats.admins} color="red" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Пользователи системы</h3>
          {loading ? (
            <div className="text-center py-8 text-zinc-500">Загрузка...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                    <th className="text-left py-2 px-2 font-medium">ID</th>
                    <th className="text-left py-2 px-2 font-medium">ФИО</th>
                    <th className="text-left py-2 px-2 font-medium">Email</th>
                    <th className="text-left py-2 px-2 font-medium">Роль</th>
                    <th className="text-left py-2 px-2 font-medium">Статус</th>
                    <th className="text-left py-2 px-2 font-medium">Создан</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-950/40">
                      <td className="py-3 px-2 font-mono text-xs text-zinc-500">#{u.id}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold text-[10px]">
                            {u.full_name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-white">{u.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-zinc-400 text-xs">{u.email}</td>
                      <td className="py-3 px-2">
                        <Badge color={u.role === 'admin' ? 'red' : u.role === 'doctor' ? 'purple' : 'zinc'}>
                          {u.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Badge color={u.is_active ? 'green' : 'amber'}>
                          {u.is_active ? 'активен' : 'заблокирован'}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-zinc-500 text-xs font-mono">
                        {new Date(u.created_at).toLocaleDateString('ru-RU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Распределение ролей</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={roleData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3}>
                {roleData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {roleData.map(r => (
              <div key={r.name} className="text-center">
                <div className="w-3 h-3 rounded mx-auto mb-1" style={{ background: r.color }} />
                <div className="text-white font-bold">{r.value}</div>
                <div className="text-[10px] text-zinc-500">{r.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ====================== МОДАЛКА ДОБАВИТЬ ПАЦИЕНТА ======================
const AddPatientModal = ({ open, onClose, onSave }) => {
  const [form, setForm] = useState({ fullName: '', email: '', birthDate: '', gender: 'male', diagnosis: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    if (!form.fullName || !form.email || !form.birthDate) { setError('Заполните обязательные поля'); return; }
    setLoading(true);
    try {
      await onSave(form);
      setForm({ fullName: '', email: '', birthDate: '', gender: 'male', diagnosis: '' });
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (!open) return null;
  const Input = ({ label, value, onChange, type = 'text', placeholder = '' }) => (
    <div>
      <label className="text-xs text-zinc-400 mb-1.5 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50" />
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="➕ Добавить пациента в БД" size="lg">
      <div className="space-y-4">
        {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="ФИО *" value={form.fullName} onChange={v => setForm(f => ({ ...f, fullName: v }))} placeholder="Иванов Иван" />
          <Input label="Email *" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" placeholder="patient@mail.ru" />
          <Input label="Дата рождения *" value={form.birthDate} onChange={v => setForm(f => ({ ...f, birthDate: v }))} type="date" />
          <Input label="Диагноз" value={form.diagnosis} onChange={v => setForm(f => ({ ...f, diagnosis: v }))} placeholder="Z00.0" />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Отмена</Button>
          <Button onClick={submit} disabled={loading} className="flex-1">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Сохранить</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ====================== ГЛАВНЫЙ КОМПОНЕНТ ======================
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [indicators, setIndicators] = useState([]);
  const [patients, setPatients] = useState([]);
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [recentUpdates, setRecentUpdates] = useState([]);

  useEffect(() => {
    const token = API.getToken();
    const savedUser = API.getUser();
    if (token && savedUser) setUser(savedUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        if (user.role === 'patient') {
          const data = await API.getMyIndicators();
          setIndicators(data.map(d => ({
            code: d.indicator_type.code, name: d.indicator_type.name, unit: d.indicator_type.unit,
            value: parseFloat(d.value), min: d.indicator_type.normal_min, max: d.indicator_type.normal_max,
            status: (d.indicator_type.normal_min && d.indicator_type.normal_max && d.value >= d.indicator_type.normal_min && d.value <= d.indicator_type.normal_max) ? 'normal' : 'warning',
          })));
        } else if (user.role === 'doctor' || user.role === 'admin') {
          const data = await API.getPatients();
          setPatients(data);
        }
      } catch (err) { console.error('Load error:', err); }
    };
    loadData();
  }, [user]);

 const showToast = (title, message) => {
    const id = Date.now();
    setToasts(t => [...t, { id, title, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000);
  };

  const handleIndicatorsUpdate = async (updates) => {
    setRecentUpdates(updates);
    setTimeout(() => setRecentUpdates([]), 8000);
    updates.forEach(u => showToast(`${u.code || u.name} обновлён`, `Значение: ${u.value}`));

    if (user?.role === 'patient') {
      try {
        const data = await API.getMyIndicators();
        setIndicators(data.map(d => ({
          code: d.indicator_type.code,
          name: d.indicator_type.name,
          unit: d.indicator_type.unit,
          value: parseFloat(d.value),
          min: d.indicator_type.normal_min,
          max: d.indicator_type.normal_max,
          status: (d.indicator_type.normal_min && d.indicator_type.normal_max && 
                   d.value >= d.indicator_type.normal_min && d.value <= d.indicator_type.normal_max) 
                  ? 'normal' : 'warning',
          updatedAt: d.measured_at,
        })));
      } catch (err) {
        console.error("Ошибка получения обновленных показателей:", err);
      }
    }
  };

  const handleAddPatient = async (form) => {
    await API.createPatient({
      email: form.email, full_name: form.fullName, birth_date: form.birthDate,
      gender: form.gender, diagnosis: form.diagnosis,
    });
    const data = await API.getPatients();
    setPatients(data);
  };

  const handleDeletePatient = async (id) => {
    await API.deletePatient(id);
    setPatients(prev => prev.filter(p => p.id !== id));
  };

  const handleLogout = () => {
    API.clear();
    setUser(null);
    setIndicators([]);
    setPatients([]);
    setPage('dashboard');
  };

  if (!user) return <AuthScreen onLogin={() => setUser(API.getUser())} />;

  const menuItems = user.role === 'patient' ? [
    { id: 'dashboard', l: 'Обзор', i: Home },
    { id: 'ml-analysis', l: 'Healix AI Анализ', i: Brain },
    { id: 'chat', l: 'Healix AI Ассистент', i: MessageSquare },
  ] : user.role === 'doctor' ? [
    { id: 'dashboard', l: 'Пациенты', i: Users },
  ] : [
    { id: 'dashboard', l: 'Пользователи', i: Users },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      <aside className="w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-zinc-800/80"><Logo /></div>
        <div className="px-4 py-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold text-sm">
              {user.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{user.full_name}</div>
              <Badge color={user.role === 'admin' ? 'purple' : user.role === 'doctor' ? 'red' : 'zinc'}>
                {user.role === 'admin' ? 'Админ' : user.role === 'doctor' ? 'Врач' : 'Пациент'}
              </Badge>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${page === item.id ? 'bg-gradient-to-r from-red-600/20 to-red-600/5 text-red-400 border border-red-500/20' : 'text-zinc-400 hover:bg-zinc-900 border border-transparent'}`}>
              <item.i size={16} /><span>{item.l}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-zinc-800/80">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-400 hover:bg-zinc-900 hover:text-red-400">
            <LogOut size={16} /> Выйти
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-x-hidden">
        {user.role === 'patient' && page === 'dashboard' && (
          <PatientDashboard setPage={setPage} indicators={indicators} recentUpdates={recentUpdates} />
        )}
        {user.role === 'patient' && page === 'ml-analysis' && (
          <MLAnalysisPage user={user} indicators={indicators} />
        )}
        {user.role === 'patient' && page === 'chat' && (
          <ChatPage user={user} indicators={indicators} onIndicatorsUpdate={handleIndicatorsUpdate} />
        )}
        {user.role === 'doctor' && (
          <DoctorDashboard patients={patients} onAddPatientClick={() => setAddPatientOpen(true)} onDeletePatient={handleDeletePatient} />
        )}
        {user.role === 'admin' && <AdminDashboard />}
      </main>

      <AddPatientModal open={addPatientOpen} onClose={() => setAddPatientOpen(false)} onSave={handleAddPatient} />
    </div>
  );
}