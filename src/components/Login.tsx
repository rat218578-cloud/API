import { useState } from 'react';
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Globe,
  GitBranch,
  User,
  AlertCircle
} from 'lucide-react';

interface LoginProps {
  onLogin: (loginValue: string, password: string) => Promise<boolean>;
  loading?: boolean;
  error?: string | null;
}

export function Login({ onLogin, loading: externalLoading, error: externalError }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loginType, setLoginType] = useState<'email' | 'cpf'>('email');
  const [cpf, setCpf] = useState('');

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2');
    }
    return value;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCpf(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const loginValue = loginType === 'email' ? email : cpf;

    if (!loginValue || !password) {
      setError('Preencha todos os campos');
      return;
    }

    if (loginType === 'email' && !email.includes('@')) {
      setError('Email inválido');
      return;
    }

    if (loginType === 'cpf' && cpf.replace(/\D/g, '').length !== 11) {
      setError('CPF inválido (deve ter 11 dígitos)');
      return;
    }

    setIsLoading(true);
    try {
      const success = await onLogin(loginValue, password);
      if (!success && externalError) {
        setError(externalError);
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const loading = externalLoading || isLoading;
  const displayError = error || externalError;

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg shadow-pink-500/20 animate-pulse-glow">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            QA<span className="text-accent-pink">.ai</span>
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Análise inteligente para seus jogos
          </p>
        </div>

        <div className="bg-bg-card border border-border-default rounded-2xl p-6 md:p-8 slide-in">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-text-primary">Bem-vindo de volta</h2>
            <p className="text-sm text-text-muted">Entre para acessar suas ferramentas</p>
          </div>

          <div className="flex bg-bg-tertiary rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => setLoginType('email')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                loginType === 'email'
                  ? 'bg-gradient-to-r from-pink-500/20 to-violet-600/20 text-text-primary border border-pink-500/30'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              type="button"
              onClick={() => setLoginType('cpf')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                loginType === 'cpf'
                  ? 'bg-gradient-to-r from-pink-500/20 to-violet-600/20 text-text-primary border border-pink-500/30'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <User className="w-4 h-4" />
              CPF
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {loginType === 'email' ? (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-bg-tertiary border border-border-default rounded-xl pl-10 pr-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-pink transition-colors"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  CPF
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={cpf}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full bg-bg-tertiary border border-border-default rounded-xl pl-10 pr-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-pink transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-text-secondary">
                  Senha
                </label>
                <button
                  type="button"
                  className="text-xs text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-bg-tertiary border border-border-default rounded-xl pl-10 pr-12 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-pink transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {displayError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {displayError}
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-border-default bg-bg-tertiary text-accent-pink focus:ring-accent-pink focus:ring-offset-0 focus:ring-1"
                />
                <span className="text-sm text-text-muted">Lembrar-me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-default" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-bg-card text-text-muted">ou continue com</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary hover:border-border-hover transition-colors">
              <Globe className="w-4 h-4" />
              <span className="text-sm">Google</span>
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary hover:border-border-hover transition-colors">
              <GitBranch className="w-4 h-4" />
              <span className="text-sm">GitHub</span>
            </button>
          </div>

          <p className="text-center text-sm text-text-muted mt-6">
            Não tem uma conta?{" "}
            <button className="text-accent-cyan hover:text-accent-cyan/80 font-medium transition-colors">
              Criar conta
            </button>
          </p>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-text-muted flex items-center justify-center gap-1.5">
            <Shield className="w-3 h-3" />
            Seguro e criptografado
          </p>
        </div>
      </div>
    </div>
  );
}
