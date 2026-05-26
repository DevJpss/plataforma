import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page verify-page">
      <motion.div
        className="verify-content"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        {sent ? (
          <>
            <div className="verify-icon">📧</div>
            <h1>Email Enviado</h1>
            <p>
              Se o email {email} estiver cadastrado, você receberá um link para redefinir sua senha.
            </p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: 24 }}>
              Voltar ao Início
            </Link>
          </>
        ) : (
          <>
            <h1>Redefinir Senha</h1>
            <p style={{ color: 'var(--text2)', marginBottom: 24 }}>
              Digite seu email para receber o link de redefinição.
            </p>
            <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360 }}>
              <div className="form-group">
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button className="btn btn-primary btn-full" type="submit">
                Enviar Link
              </button>
            </form>
            <Link to="/" className="btn btn-ghost" style={{ marginTop: 16 }}>
              Voltar
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
