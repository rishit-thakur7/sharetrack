import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Zap, ArrowRight, LogOut, User, Map, X, Menu } from 'lucide-react';
import sign from '../public/sign.png'

const GridBackground = () => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% -10%, #0f1a2e 0%, #050508 60%, #000 100%)' }} />
    <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(56,189,248,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.04) 1px, transparent 1px)`, backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse 100% 70% at 50% 0%, black 30%, transparent 100%)' }} />
    <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '900px', height: '500px', background: 'radial-gradient(ellipse, rgba(56,189,248,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', top: '20%', left: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(20,184,166,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
  </div>
);

const PingDot = ({ style }) => (
  <span style={{ position: 'relative', display: 'inline-flex', ...style }}>
    <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22c55e', opacity: 0.6, animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite' }} />
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'block' }} />
  </span>
);

const Landing = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getUserFromStorage = () => {
    try {
      const saved = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (saved && token) return JSON.parse(saved);
    } catch (e) { }
    return null;
  };
  const user = getUserFromStorage();
  const isSharing = false;
  const tripData = null;

  const handleGetStarted = () => navigate(user ? '/dashboard' : '/auth');
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const features = [
    { icon: '📍', title: 'Live Location', desc: 'Share your GPS position with friends in real-time', accent: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.2)' },
    { icon: '🗺️', title: 'Route Sharing', desc: "Friends see your route and destination on their map", accent: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.2)' },
    { icon: '💬', title: 'Live Chat', desc: 'Message friends while tracking each other', accent: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.2)' }
  ];

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes mobileMenuIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }

        .gradient-text {
          background: linear-gradient(135deg, #e2e8f0 0%, #ffffff 40%, #7dd3fc 70%, #a5b4fc 100%);
          background-size: 200% auto;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .hero-title {
          background: linear-gradient(180deg, #f8fafc 0%, #94a3b8 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .btn-primary {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(148,163,184,0.2); position: relative; overflow: hidden;
        }
        .btn-primary::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(56,189,248,0.1) 0%, rgba(99,102,241,0.1) 100%); opacity: 0; transition: opacity 0.3s; }
        .btn-primary:hover::before { opacity: 1; }
        .btn-primary:hover { border-color: rgba(148,163,184,0.4); }
        .feature-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .feature-card:hover { transform: translateY(-4px); }
        .trip-card { background: linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(9,9,11,0.8) 100%); backdrop-filter: blur(24px); border: 1px solid rgba(148,163,184,0.1); transition: all 0.3s; animation: float 5s ease-in-out infinite; }
        .trip-card:hover { box-shadow: 0 0 40px rgba(56,189,248,0.08), 0 8px 32px rgba(0,0,0,0.4); }
        .divider-line { background: linear-gradient(90deg, transparent, rgba(148,163,184,0.2), transparent); height: 1px; }
        .mob-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(4,4,6,0.97); backdrop-filter: blur(20px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; animation: mobileMenuIn 0.22s ease; }
        .mob-btn { width: min(260px, 80vw); padding: 14px 20px; border-radius: 14px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; border: 1px solid rgba(148,163,184,0.15); background: rgba(15,23,42,0.6); color: #e2e8f0; transition: all 0.2s; }
        .mob-btn:hover { background: rgba(30,41,59,0.8); }
        .mob-close { position: absolute; top: 18px; right: 18px; background: rgba(15,23,42,0.6); border: 1px solid rgba(148,163,184,0.12); border-radius: 10px; color: #64748b; cursor: pointer; padding: 8px; display: flex; }
        .nav-desktop { display: none; }
        .nav-hamburger { display: flex; }
        .nav-username { display: none; }
        .hero-sub { font-size: 15px; }
        .trip-maxw { max-width: 100%; }
        .features-grid { grid-template-columns: 1fr; max-width: 100%; }

        @media (min-width: 480px) {
          .features-grid { grid-template-columns: repeat(2, 1fr); }
          .trip-maxw { max-width: 440px; }
        }
        @media (min-width: 768px) {
          .nav-desktop { display: flex; }
          .nav-hamburger { display: none; }
          .nav-username { display: inline; }
          .hero-sub { font-size: 17px; }
          .trip-maxw { max-width: 460px; }
        }
        @media (min-width: 900px) {
          .features-grid { grid-template-columns: repeat(3, 1fr); max-width: 860px; }
          .hero-sub { font-size: 18px; }
        }
      `}</style>

      <main style={{ minHeight: '100vh', background: '#000', overflowX: 'hidden', fontFamily: "'DM Sans', sans-serif" }}>
        <GridBackground />

        {mobileMenuOpen && (
          <div className="mob-overlay">
            <button className="mob-close" onClick={() => setMobileMenuOpen(false)}><X size={20} /></button>
            <div style={{ marginBottom: 8, textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <MapPin style={{ width: 22, height: 22, color: '#7dd3fc' }} />
              </div>
              <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 18, fontFamily: "'Syne', sans-serif" }}>ShareTrack</p>
            </div>
            {user ? (
              <>
                <div style={{ padding: '10px 20px', borderRadius: 12, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.1)', display: 'flex', alignItems: 'center', gap: 10, width: 'min(260px, 80vw)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#1e3a5f,#1e1b4b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: 700, fontSize: 13 }}>{user.name?.charAt(0)}</div>
                  <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 500 }}>{user.name}</span>
                </div>
                <button className="mob-btn" onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}>Go to Dashboard</button>
                <button className="mob-btn" onClick={() => { handleLogout(); setMobileMenuOpen(false); }} style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)' }}>Logout</button>
              </>
            ) : (
              <>
                <button className="mob-btn" onClick={() => { navigate('/auth', { state: { screen: 'login' } }); setMobileMenuOpen(false); }}>Login</button>
                <button className="mob-btn" onClick={() => { navigate('/auth', { state: { screen: 'signup' } }); setMobileMenuOpen(false); }} style={{ color: '#7dd3fc', borderColor: 'rgba(56,189,248,0.2)', background: 'rgba(56,189,248,0.06)' }}>Sign Up Free</button>

              </>
            )}
          </div>
        )}

        <div style={{ position: 'relative', zIndex: 10 }}>
          <motion.nav
            initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'clamp(14px,3vw,20px) clamp(16px,4vw,40px)', maxWidth: '1280px', margin: '0 auto' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
              <div style={{ position: 'relative', padding: 8, background: 'rgba(56,189,248,0.08)', borderRadius: 12, border: '1px solid rgba(56,189,248,0.15)' }}>
                <MapPin style={{ width: 20, height: 20, color: '#7dd3fc' }} />
                {isSharing && <PingDot style={{ position: 'absolute', top: -3, right: -3 }} />}
              </div>
              <span style={{ fontSize: 'clamp(17px,3vw,20px)', fontWeight: 700, color: '#f8fafc', fontFamily: "'Syne', sans-serif", letterSpacing: '-0.02em' }}>ShareTrack</span>
            </div>

            <div className="nav-desktop" style={{ alignItems: 'center', gap: 12 }}>
              {user ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderRadius: 12, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(148,163,184,0.1)' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#1e3a5f,#1e1b4b)', border: '1px solid rgba(148,163,184,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User style={{ width: 14, height: 14, color: '#94a3b8' }} />
                    </div>
                    <span className="nav-username" style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 500 }}>{user.name}</span>
                  </div>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleLogout}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: '#f87171', fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                    <LogOut style={{ width: 14, height: 14 }} /> Logout
                  </motion.button>
                </>
              ) : (
                <>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/auth', { state: { screen: 'login' } })}
                    style={{ padding: '9px 20px', background: 'transparent', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 12, color: '#94a3b8', fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Login</motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/auth', { state: { screen: 'signup' } })} className="btn-primary"
                    style={{ padding: '9px 20px', borderRadius: 12, color: '#e2e8f0', fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }}>Sign Up Free</motion.button>

                </>
              )}
            </div>

            <button className="nav-hamburger" onClick={() => setMobileMenuOpen(true)}
              style={{ alignItems: 'center', justifyContent: 'center', width: 40, height: 40, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 10, color: '#94a3b8', cursor: 'pointer' }}>
              <Menu size={18} />
            </button>
          </motion.nav>

          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(32px,6vw,60px) clamp(16px,4vw,40px) clamp(48px,8vw,80px)', textAlign: 'center' }}>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 100, marginBottom: 'clamp(20px,4vw,32px)' }}>
              <PingDot />
              <span style={{ fontSize: 11, color: '#7dd3fc', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Real-time location sharing</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, lineHeight: 1.05, marginBottom: 'clamp(14px,3vw,24px)' }}>
              <span className="hero-title" style={{ fontSize: 'clamp(30px,7vw,80px)', display: 'block' }}>Share Your Journey</span>
              <span className="gradient-text" style={{ fontSize: 'clamp(34px,8vw,92px)', display: 'block', marginTop: 4 }}>in Real-Time</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}
              className="hero-sub"
              style={{ color: '#64748b', maxWidth: 520, margin: '0 auto clamp(24px,5vw,40px)', lineHeight: 1.7, fontWeight: 300, padding: '0 4px' }}>
              Share your live location and route with friends. They'll see exactly where you are and where you're headed — in real-time.
            </motion.p>

            <motion.button initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.55 }}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={handleGetStarted} className="btn-primary"
              style={{ padding: 'clamp(11px,2vw,14px) clamp(22px,4vw,32px)', borderRadius: 14, fontSize: 'clamp(14px,2vw,16px)', fontWeight: 600, color: '#f1f5f9', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: "'DM Sans',sans-serif" }}>
              <Zap style={{ width: 17, height: 17, color: '#fbbf24' }} />
              {user ? 'Go to Dashboard' : 'Get Started'}
              <ArrowRight style={{ width: 17, height: 17 }} />
            </motion.button>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.75 }}
              className="trip-card trip-maxw"
              style={{ marginTop: 'clamp(32px,6vw,56px)', borderRadius: 20, padding: 'clamp(16px,3vw,20px) clamp(16px,3vw,24px)', marginLeft: 'auto', marginRight: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: isSharing ? 'linear-gradient(135deg,rgba(34,197,94,0.15),rgba(20,184,166,0.1))' : 'rgba(30,41,59,0.8)', border: `1px solid ${isSharing ? 'rgba(34,197,94,0.25)' : 'rgba(148,163,184,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isSharing ? <MapPin style={{ width: 20, height: 20, color: '#4ade80' }} /> : <Map style={{ width: 20, height: 20, color: '#475569' }} />}
                </div>
                <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {isSharing ? <PingDot style={{ flexShrink: 0 }} /> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#334155', display: 'inline-block', flexShrink: 0 }} />}
                    <span style={{ fontSize: 11, color: isSharing ? '#4ade80' : '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{isSharing ? 'Live Trip Active' : 'Last Trip'}</span>
                  </div>
                  {tripData ? (
                    <div style={{ fontSize: 13, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📍 {tripData.destination?.name || 'Unknown'} · {tripData.distance} km · ETA {tripData.duration} min
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#334155' }}>No trip data available</div>
                  )}
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: isSharing ? 'linear-gradient(135deg,#22c55e,#14b8a6)' : '#1e293b', boxShadow: isSharing ? '0 0 10px rgba(34,197,94,0.5)' : 'none' }} />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration: 1, delay: 1 }}
              className="divider-line" style={{ maxWidth: 500, margin: 'clamp(36px,6vw,56px) auto 0' }} />

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1 }}
              className="features-grid"
              style={{ marginTop: 'clamp(28px,5vw,48px)', display: 'grid', gap: 14, marginLeft: 'auto', marginRight: 'auto', paddingBottom: 'clamp(40px,6vw,60px)' }}>
              {features.map((feature, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.05 + i * 0.1 }}
                  className="feature-card"
                  style={{ background: feature.accent, border: `1px solid ${feature.border}`, borderRadius: 18, padding: 'clamp(18px,3vw,24px) clamp(16px,3vw,22px)', textAlign: 'left', backdropFilter: 'blur(12px)' }}>
                  <div style={{ fontSize: 28, marginBottom: 12, lineHeight: 1 }}>{feature.icon}</div>
                  <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, marginBottom: 6, fontFamily: "'Syne',sans-serif" }}>{feature.title}</h3>
                  <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, fontWeight: 300 }}>{feature.desc}</p>
                </motion.div>
              ))}
            </motion.div>

          </div>

          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.5 }}
            style={{
              marginTop: 'auto',
              padding: '60px 20px 40px',
              textAlign: 'center',
              borderTop: '1px solid rgba(148,163,184,0.05)',
              background: 'linear-gradient(to top, rgba(15,23,42,0.3), transparent)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{
                fontSize: 10,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                fontWeight: 600,
                fontFamily: "'Syne', sans-serif",
                marginBottom: -10
              }}>
                Developed by
              </span>
              <img
                src={sign}
                alt="Rishit Signature"
                loading="lazy"
                decoding="async"
                width="200"
                height="70"
                style={{
                  height: 'clamp(50px, 8vw, 70px)',
                  width: 'auto',
                  opacity: 0.9,
                  filter: 'brightness(1.5) contrast(1.2)',
                  mixBlendMode: 'screen',
                  userSelect: 'none',
                  pointerEvents: 'none'
                }}
              />
            </div>
          </motion.footer>

        </div>
      </main>
    </>
  );
};

export default Landing;