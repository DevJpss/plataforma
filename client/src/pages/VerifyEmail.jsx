import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../utils/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de verificação ausente.');
      return;
    }
    api.get(`/api/auth/verify?token=${token}`)
      .then(() => {
        setStatus('success');
        setMessage('Email verificado com sucesso! Sua conta está ativa.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Token inválido ou expirado.');
      });
  }, [token]);

  return (
    <div className="page verify-page">
      <motion.div
        className="verify-content"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        {status === 'verifying' && (
          <>
            <div className="verify-icon">⏳</div>
            <h1>Verificando seu email...</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="verify-icon">✅</div>
            <h1>Email Verificado!</h1>
            <p>{message}</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: 24 }}>
              Ir para o Início
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="verify-icon">❌</div>
            <h1>Falha na Verificação</h1>
            <p>{message}</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: 24 }}>
              Voltar
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
