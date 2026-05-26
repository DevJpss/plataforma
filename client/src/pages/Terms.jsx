import RevealText from '../components/RevealText';
import { motion } from 'framer-motion';

export default function Terms() {
  return (
    <div className="page static-page">
      <motion.div className="static-content" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
        <RevealText as="h1">Termos de Uso</RevealText>
        <p>Ao acessar o AdultHub, você declara ter 18 anos ou mais e concorda em não compartilhar conteúdo ilegal. Todo conteúdo é enviado por usuários sob sua própria responsabilidade. O AdultHub não se responsabiliza por materiais que violem direitos autorais.</p>
        <p>É proibido enviar conteúdo envolvendo menores, violência extrema ou qualquer material ilegal segundo a legislação brasileira. Contas que violarem estes termos serão banidas permanentemente e os materiais denunciados às autoridades.</p>
      </motion.div>
    </div>
  );
}

export function Privacy() {
  return (
    <div className="page static-page">
      <motion.div className="static-content" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
        <RevealText as="h1">Política de Privacidade</RevealText>
        <p>Coletamos apenas dados necessários para o funcionamento da plataforma: email, nome de usuário e data de criação. Sua senha é armazenada de forma criptografada. Não compartilhamos seus dados com terceiros.</p>
        <p>Você pode solicitar a exclusão dos seus dados a qualquer momento entrando em contato.</p>
      </motion.div>
    </div>
  );
}

export function DMCA() {
  return (
    <div className="page static-page">
      <motion.div className="static-content" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
        <RevealText as="h1">DMCA / Direitos Autorais</RevealText>
        <p>Respeitamos os direitos autorais. Se você acredita que seu conteúdo protegido por direitos autorais foi publicado sem autorização, entre em contato com nosso agente DMCA.</p>
        <p>Envie um email com o link do conteúdo e comprovante de titularidade para: dmca@adultub.com</p>
      </motion.div>
    </div>
  );
}
