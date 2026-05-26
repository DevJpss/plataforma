import { useEffect, useRef } from 'react';
import useMousePosition from '../hooks/useMousePosition';

const COUNT = 80;

export default function Particles() {
  const canvasRef = useRef(null);
  const mouse = useMousePosition();
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    if (!particlesRef.current.length) {
      particlesRef.current = Array.from({ length: COUNT }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
      }));
    }

    const p = particlesRef.current;

    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      p.forEach((pt) => {
        pt.x += pt.vx;
        pt.y += pt.vy;

        if (pt.x < 0) pt.x = window.innerWidth;
        if (pt.x > window.innerWidth) pt.x = 0;
        if (pt.y < 0) pt.y = window.innerHeight;
        if (pt.y > window.innerHeight) pt.y = 0;

        const dx = mouse.x - pt.x;
        const dy = mouse.y - pt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          pt.vx -= dx * 0.0003;
          pt.vy -= dy * 0.0003;
          pt.vx = Math.max(-1.5, Math.min(1.5, pt.vx));
          pt.vy = Math.max(-1.5, Math.min(1.5, pt.vy));
        }

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232, 44, 95, ${pt.alpha})`;
        ctx.fill();
      });

      p.forEach((a, i) => {
        for (let j = i + 1; j < p.length; j++) {
          const dx = a.x - p[j].x;
          const dy = a.y - p[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(p[j].x, p[j].y);
            ctx.strokeStyle = `rgba(232, 44, 95, ${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [mouse]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
