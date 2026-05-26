import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../utils/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Mínimo 8 caracteres');
    if (password !== confirm) return setError('Senhas não conferem');
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!token) {
    return (
      <div className="page verify-page">
        <div className="verify-content">
          <div className="verify-icon">❌</div>
          <h1>Link Inválido</h1>
          <p>Token de redefinição ausente.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 24 }}>Voltar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page verify-page">
      <motion.div
        className="verify-content"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        {done ? (
          <>
            <div className="verify-icon">✅</div>
            <h1>Senha Redefinida!</h1>
            <p>Sua senha foi alterada com sucesso. Faça login com sua nova senha.</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: 24 }}>
              Fazer Login
            </Link>
          </>
        ) : (
          <>
            <h1>Nova Senha</h1>
            <p style={{ color: 'var(--text2)', marginBottom: 24 }}>
              Escolha uma nova senha para sua conta.
            </p>
            <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360 }}>
              <div className="form-group">
                <input
                  type="password"
                  placeholder="Nova senha (mín. 8 caracteres)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="form-group">
                <input
                  type="password"
                  placeholder="Confirmar senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button className="btn btn-primary btn-full" type="submit">
                Redefinir Senha
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
