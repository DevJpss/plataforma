import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="brand-icon">◆</span>
          <span className="brand-text">AdultHub</span>
        </div>
        <div className="footer-links">
          <Link to="/terms">Termos</Link>
          <Link to="/privacy">Privacidade</Link>
          <Link to="/dmca">DMCA</Link>
          <a href="mailto:contato@adultub.com">Contato</a>
        </div>
        <div className="footer-copy">
          © {new Date().getFullYear()} AdultHub. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
