import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Videos from './pages/Videos';
import Watch from './pages/Watch';
import Upload from './pages/Upload';
import Profile from './pages/Profile';
import Forum from './pages/Forum';
import ForumPost from './pages/ForumPost';
import Settings from './pages/Settings';
import Lives from './pages/Lives';
import Terms, { Privacy, DMCA } from './pages/Terms';

function ScrollToTop() {
  const { pathname } = window.location;
  if (pathname) window.scrollTo(0, 0);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="app">
            <ScrollToTop />
            <Navbar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/videos" element={<Videos />} />
                <Route path="/watch/:id" element={<Watch />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/forum" element={<Forum />} />
                <Route path="/forum/:id" element={<ForumPost />} />
                <Route path="/profile/:username" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/lives" element={<Lives />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/dmca" element={<DMCA />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
