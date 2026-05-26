import useMousePosition from '../hooks/useMousePosition';
import { useEffect, useState } from 'react';

export default function CustomCursor() {
  const mouse = useMousePosition();
  const [visible, setVisible] = useState(false);
  const [clicking, setClicking] = useState(false);

  useEffect(() => {
    const show = () => setVisible(true);
    const hide = () => setVisible(false);
    const down = () => setClicking(true);
    const up = () => setClicking(false);

    document.addEventListener('mouseenter', show);
    document.addEventListener('mouseleave', hide);
    document.addEventListener('mousedown', down);
    document.addEventListener('mouseup', up);

    return () => {
      document.removeEventListener('mouseenter', show);
      document.removeEventListener('mouseleave', hide);
      document.removeEventListener('mousedown', down);
      document.removeEventListener('mouseup', up);
    };
  }, []);

  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
    return null;
  }

  return (
    <>
      <div
        className="custom-cursor-dot"
        style={{
          left: mouse.x,
          top: mouse.y,
          opacity: visible ? 1 : 0,
          transform: clicking ? 'scale(0.6)' : 'scale(1)',
        }}
      />
      <div
        className="custom-cursor-ring"
        style={{
          left: mouse.x,
          top: mouse.y,
          opacity: visible ? 1 : 0,
          transform: clicking ? 'scale(0.8)' : 'scale(1)',
        }}
      />
    </>
  );
}
