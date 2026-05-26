import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export default function MagneticBtn({ children, to, href, className = '', ...props }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMouse = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setPos({ x: x * 0.3, y: y * 0.3 });
  };

  const handleLeave = () => setPos({ x: 0, y: 0 });

  const style = {
    transform: `translate(${pos.x}px, ${pos.y}px)`,
    transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
  };

  if (to) {
    return (
      <Link
        ref={ref}
        to={to}
        className={className}
        style={style}
        onMouseMove={handleMouse}
        onMouseLeave={handleLeave}
        {...props}
      >
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        ref={ref}
        href={href}
        className={className}
        style={style}
        onMouseMove={handleMouse}
        onMouseLeave={handleLeave}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      className={className}
      style={style}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      {...props}
    >
      {children}
    </button>
  );
}
