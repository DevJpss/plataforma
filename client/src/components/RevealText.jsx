import { motion } from 'framer-motion';

export default function RevealText({ children, as: Tag = 'h2', className = '', delay = 0 }) {
  const words = typeof children === 'string' ? children.split(' ') : [children];

  return (
    <Tag className={className} style={{ overflow: 'hidden', display: 'flex', flexWrap: 'wrap', gap: '0.25em' }}>
      {words.map((word, i) => (
        <span key={i} style={{ display: 'inline-block', overflow: 'hidden' }}>
          <motion.span
            style={{ display: 'inline-block' }}
            initial={{ y: '100%' }}
            whileInView={{ y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.6,
              delay: delay + i * 0.04,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            {word}{i < words.length - 1 ? '\u00A0' : ''}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
