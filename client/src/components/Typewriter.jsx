import { useState, useEffect } from 'react';

const WORDS = ['Tesão', 'Prazer', 'Desejo', 'Volúpia', 'Luxúria', 'Frenesi'];

export default function Typewriter() {
  const [word, setWord] = useState('');
  const [index, setIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = WORDS[index];
    let timeout;

    if (!deleting && charIndex < current.length) {
      timeout = setTimeout(() => setCharIndex((c) => c + 1), 90);
    } else if (!deleting && charIndex >= current.length) {
      timeout = setTimeout(() => setDeleting(true), 2000);
    } else if (deleting && charIndex > 0) {
      timeout = setTimeout(() => setCharIndex((c) => c - 1), 40);
    } else if (deleting && charIndex <= 0) {
      setDeleting(false);
      setIndex((i) => (i + 1) % WORDS.length);
    }

    return () => clearTimeout(timeout);
  }, [charIndex, deleting, index]);

  useEffect(() => {
    setWord(WORDS[index].substring(0, charIndex));
  }, [charIndex, index]);

  return (
    <span className="typewriter">
      {word}<span className="cursor-blink">|</span>
    </span>
  );
}
