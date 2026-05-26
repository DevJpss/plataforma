import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div className="page not-found-page">
      <motion.div
        className="not-found-content"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="not-found-code">404</div>
        <h1 className="not-found-title">Página não encontrada</h1>
        <p className="not-found-desc">
          O conteúdo que você procura não existe ou foi removido.
        </p>
        <Link to="/" className="btn btn-primary btn-hero">
          Voltar ao Início
        </Link>
      </motion.div>
    </div>
  );
}
