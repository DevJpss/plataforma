import { useState, useEffect } from 'react';

export default function useMousePosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [elPos, setElPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handle = (e) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }, []);

  return { pos, elPos, setElPos };
}
