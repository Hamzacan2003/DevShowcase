import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import axios from 'axios';
import { 
  Send, User, Mail, Phone, MessageSquare, 
  CheckCircle2, AlertCircle, Code2, Database, Server, MapPin, Award, ChevronDown 
} from 'lucide-react';

export default function App() {
  const canvasRef = useRef(null);
  const introOverlayRef = useRef(null);
  const mainContentRef = useRef(null);
  const [hasExploded, setHasExploded] = useState(false);

  // Form State
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    topic: 'Özel Web & Randevu Sitesi',
    message: ''
  });

  // Bot Korumaları State'leri
  const [honeypot, setHoneypot] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Three.js Patlama Mantığı Referansı
  const triggerExplosionRef = useRef(null);

  useEffect(() => {
    // 1. Three.js Sahnesi
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 4.0;

    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      alpha: true, 
      antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 2. Küre Partikülleri
    const particleCount = 2800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);
    const explosionVelocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      const r = 1.25 * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i] = x;
      positions[i + 1] = y;
      positions[i + 2] = z;

      originalPositions[i] = x;
      originalPositions[i + 1] = y;
      originalPositions[i + 2] = z;

      const speed = 2.5 + Math.random() * 7.0;
      explosionVelocities[i] = (x / r) * speed;
      explosionVelocities[i + 1] = (y / r) * speed;
      explosionVelocities[i + 2] = (z / r) * speed;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x00f2fe,
      size: 0.026,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });

    const particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    let animationFrameId;
    let exploded = false;
    let explosionProgress = { val: 0 };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!exploded) {
        particleSystem.rotation.y += 0.005;
        particleSystem.rotation.x += 0.002;
      } else {
        const currentPos = geometry.attributes.position.array;
        for (let i = 0; i < particleCount * 3; i += 3) {
          currentPos[i] = originalPositions[i] + explosionVelocities[i] * explosionProgress.val;
          currentPos[i + 1] = originalPositions[i + 1] + explosionVelocities[i + 1] * explosionProgress.val;
          currentPos[i + 2] = originalPositions[i + 2] + explosionVelocities[i + 2] * explosionProgress.val;
        }
        geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    const executeExplosion = () => {
      if (exploded) return;
      exploded = true;
      setHasExploded(true);

      const tl = gsap.timeline();

      tl.to(introOverlayRef.current, {
        opacity: 0,
        scale: 0.9,
        duration: 0.5,
        ease: 'power2.out',
        pointerEvents: 'none'
      })
      .to(explosionProgress, {
        val: 3.5,
        duration: 1.4,
        ease: 'expo.out'
      }, '-=0.3')
      .to(material, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
      }, '-=0.8')
      .to(mainContentRef.current, {
        opacity: 1,
        y: 0,
        duration: 1.2,
        ease: 'power3.out'
      }, '-=0.6');
    };

    triggerExplosionRef.current = executeExplosion;

    const handleScrollOrTouch = () => {
      if (!exploded) {
        executeExplosion();
      }
    };

    window.addEventListener('wheel', handleScrollOrTouch, { passive: true });
    window.addEventListener('touchstart', handleScrollOrTouch, { passive: true });

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('wheel', handleScrollOrTouch);
      window.removeEventListener('touchstart', handleScrollOrTouch);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, []);

  // Form Gönderimi (.NET Web API)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cooldown > 0) return;

    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    const cleanPhone = (form.phone || '').toString().replace(/\D/g, '').trim();

    if (cleanPhone.length !== 11) {
      setErrorMsg(`Telefon numarası 11 haneli olmalıdır (05xxxxxxxxx). Girilen: ${cleanPhone.length} hane.`);
      setLoading(false);
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: cleanPhone,
      topic: form.topic,
      message: form.message.trim(),
      honeypot: honeypot // Bot doldurursa sunucu algılar
    };

    try {
     // Yeni Hali (Canlı Render URL'i):
// Yeni hali:
const response = await axios.post('https://devshowcase-kl6s.onrender.com/api/contact', payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      setSuccessMsg('Mesajınız başarıyla iletildi. En kısa sürede geri dönüş yapacağım.');
      setForm({ fullName: '', email: '', phone: '', topic: 'Özel Web & Randevu Sitesi', message: '' });
      setHoneypot('');

      // Başarılı gönderim sonrası 30 saniyelik anti-spam geri sayımı
      setCooldown(30);
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Gönderim hatası:", err);
      if (err.response?.status === 429) {
        setErrorMsg('Çok fazla istek gönderdiniz. Lütfen 1 dakika bekleyip tekrar deneyin.');
      } else {
        const detail = err.response?.data?.message || err.response?.data || err.message;
        setErrorMsg(typeof detail === 'string' ? detail : 'Sunucu bağlantısı sağlanamadı. Backend servisinin açık olduğunu teyit edin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#040812] text-slate-100 overflow-x-hidden selection:bg-cyan-500 selection:text-black font-sans">
      
      {/* 3D PATLAMA CANVAS'I */}
      <canvas 
        ref={canvasRef} 
        className={`fixed inset-0 w-full h-full pointer-events-none z-30 transition-opacity duration-1000 ${
          hasExploded ? 'pointer-events-none' : ''
        }`} 
      />

      {/* AÇILIŞ İNTROSU */}
      <div 
        ref={introOverlayRef}
        className="fixed inset-0 z-40 flex flex-col items-center justify-between py-12 px-6 text-center bg-transparent backdrop-blur-[2px]"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/60 text-cyan-300 text-xs font-mono tracking-widest uppercase">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          Engineering Terminal Online
        </div>

        <div className="max-w-xl pointer-events-none">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-3">
            HAMZA CAN ALTINTOP
          </h1>
          <p className="text-cyan-400 font-mono text-sm tracking-widest uppercase">
            Full-Stack Software Engineer & DevOps
          </p>
        </div>

        <button 
          onClick={() => triggerExplosionRef.current && triggerExplosionRef.current()}
          className="group cursor-pointer flex flex-col items-center gap-2 text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <span className="text-xs font-mono tracking-widest uppercase bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 group-hover:border-cyan-500/50 transition-all">
            Sisteme Giriş Yapın (Kaydırın veya Tıklayın)
          </span>
          <ChevronDown className="animate-bounce text-cyan-400" size={20} />
        </button>
      </div>

      {/* ANA SAYFA / VİTRİN */}
      <main 
        ref={mainContentRef}
        style={{ opacity: 0, transform: 'translateY(80px)' }}
        className="relative z-20 max-w-6xl mx-auto px-6 pt-24 pb-20"
      >
        {/* Header & Sosyal Medya */}
        <header className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800/80 pb-8 text-center md:text-left">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-950/30 text-cyan-400 text-xs font-mono mb-4">
              Showcase V1.0 • Mühendislik & Çözüm Mimarisi
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Yazılım Mimarisi & Çözüm Ekosistemi
            </h2>
            <p className="text-slate-400 mt-2 text-base max-w-2xl">
              Kurumsal .NET Clean Architecture, dağıtık veritabanları, CBS harita analizleri, yapay zeka modelleri ve yüksek dönüşümlü modern web otomasyonları.
            </p>
          </div>

          {/* Sosyal Medya Butonları */}
          <div className="flex items-center justify-center md:justify-end gap-3">
            <a 
              href="https://github.com/HAMZA-CAN-ALTINTOP" 
              target="_blank" 
              rel="noreferrer"
              className="p-3 bg-slate-900 border border-slate-800 rounded-xl hover:border-cyan-500 hover:text-cyan-400 transition-all text-slate-300"
              title="GitHub"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
            <a 
              href="https://linkedin.com/in/hamza-can-altintop" 
              target="_blank" 
              rel="noreferrer"
              className="p-3 bg-slate-900 border border-slate-800 rounded-xl hover:border-cyan-500 hover:text-cyan-400 transition-all text-slate-300"
              title="LinkedIn"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            </a>
            <a 
              href="https://instagram.com/hamzacanaltintop06" 
              target="_blank" 
              rel="noreferrer"
              className="p-3 bg-slate-900 border border-slate-800 rounded-xl hover:border-cyan-500 hover:text-cyan-400 transition-all text-slate-300"
              title="Instagram"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
          </div>
        </header>

        {/* Profil Kartı */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-xl mb-12 shadow-2xl">
          <div className="md:col-span-4 flex justify-center">
            <div className="w-56 h-64 bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-2 text-center shadow-inner relative">
              <img 
                src="/hamza.jpeg" 
                alt="Hamza Can Altıntop"
                className="w-full h-full object-cover object-top rounded-xl"
              />
            </div>
          </div>

          <div className="md:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-bold text-white">Hamza Can ALTINTOP</h3>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-0.5 rounded-full font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Ankara Büyükşehir Belediyesi (Aktif)
              </span>
            </div>
            
            <p className="text-slate-300 text-sm leading-relaxed">
              Kırklareli Üniversitesi Yazılım Mühendisliği bölümünü <strong>3.75/4.00 GANO ile Bölüm İkincisi ve Fakülte Üçüncüsü</strong> olarak tamamlamış, lise birincisi yazılım mühendisi. Mikroservis mimarileri, .NET Web API tabanlı Clean Core kurguları, CBS/GIS harita analizleri, yapay zeka modelleri ve yüksek dönüşümlü ticari web otomasyonları üzerine odaklanmaktadır.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2"><MapPin size={14} className="text-cyan-400" /> Ankara, Türkiye</div>
              <div className="flex items-center gap-2"><Award size={14} className="text-cyan-400" /> Derece Mezuniyet (3.75)</div>
              <div className="flex items-center gap-2"><Server size={14} className="text-cyan-400" /> Full-Stack & DevOps</div>
            </div>
          </div>
        </div>

        {/* NELER YAPIYORUZ & TİCARİ ÇÖZÜMLERİMİZ */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-6 text-cyan-400">
            <Code2 size={22} />
            <h3 className="text-2xl font-bold text-white">Sektörel & Özel Çözüm Yetkinliklerimiz</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-cyan-500/50 transition-all">
              <span className="text-cyan-400 font-mono text-[11px] block mb-1">Dinamik & Etkileşimli</span>
              <h4 className="text-sm font-bold text-white mb-2">Modern Web Siteleri & Portfolyo</h4>
              <p className="text-slate-300 leading-relaxed">
                Three.js 3D animasyonlar, GSAP geçişleri ve modern React/Tailwind arayüzleriyle markanızı öne çıkaran etkileşimli kurumsal ve kişisel web platformları.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-cyan-500/50 transition-all">
              <span className="text-cyan-400 font-mono text-[11px] block mb-1">E-Ticaret & Ödeme</span>
              <h4 className="text-sm font-bold text-white mb-2">E-Ticaret Altyapıları</h4>
              <p className="text-slate-300 leading-relaxed">
                Dinamik sepet mimarisi, ürün filtreleme, Sanal POS ödeme entegrasyonları, anlık stok takip paneli ve müşteri sipariş yönetim sistemleri.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-cyan-500/50 transition-all">
              <span className="text-cyan-400 font-mono text-[11px] block mb-1">Sağlık & Medikal</span>
              <h4 className="text-sm font-bold text-white mb-2">Hastane & Özel Klinik Sistemleri</h4>
              <p className="text-slate-300 leading-relaxed">
                Hasta kabul, online randevu, reçete/anamnez takibi, hekim takvimleri ve bulut veritabanlı faturalandırma otomasyonları.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-cyan-500/50 transition-all">
              <span className="text-indigo-400 font-mono text-[11px] block mb-1">Hizmet & İşletme</span>
              <h4 className="text-sm font-bold text-white mb-2">Kafe & Restoran Stok Otomasyonu</h4>
              <p className="text-slate-300 leading-relaxed">
                QR Menü, anlık masa adisyon takibi, mutfak sipariş ekranı, hammadde stok kontrolü ve günlük/aylık ciro raporlama sistemleri.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-cyan-500/50 transition-all">
              <span className="text-indigo-400 font-mono text-[11px] block mb-1">Gayrimenkul & Otomotiv</span>
              <h4 className="text-sm font-bold text-white mb-2">Emlak & Vasıta İlan Siteleri</h4>
              <p className="text-slate-300 leading-relaxed">
                Kullanıcı ilan paneli, gelişmiş parsel/harita filtrelemesi, detaylı arama motoru ve dinamik medya yükleme mimarileri.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-cyan-500/50 transition-all">
              <span className="text-indigo-400 font-mono text-[11px] block mb-1">Bireysel & Kurumsal</span>
              <h4 className="text-sm font-bold text-white mb-2">Kişiye Özel Site & Randevu Takip</h4>
              <p className="text-slate-300 leading-relaxed">
                Avukatlar, doktorlar, kuaförler ve danışmanlar için SMS/Mail bildirimli otomatik online randevu ve müşteri takip sistemleri.
              </p>
            </div>
          </div>
        </section>

        {/* EĞİTİM & AKADEMİK DERECELER */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-6 text-cyan-400">
            <Award size={22} />
            <h3 className="text-2xl font-bold text-white">Akademik Başarılar & Eğitim</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-800/40">
                  2022 — 2026
                </span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-800/40">
                  GANO: 3.75 / 4.00
                </span>
              </div>
              <h4 className="text-lg font-bold text-white mt-1">Kırklareli Üniversitesi</h4>
              <p className="text-xs text-cyan-300 font-mono mb-3">Yazılım Mühendisliği (Lisans)</p>
              <div className="space-y-1.5 text-xs text-slate-300 pt-3 border-t border-slate-800/80">
                <p className="flex items-center gap-2 text-amber-300 font-medium">
                  ★ Yazılım Mühendisliği Bölüm İkinciliği (2.)
                </p>
                <p className="flex items-center gap-2 text-amber-300 font-medium">
                  ★ Mühendislik Fakültesi Üçüncülüğü (3.)
                </p>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-800/40">
                  2018 — 2022
                </span>
                <span className="text-xs font-mono text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded border border-amber-800/40">
                  Okul Birincisi
                </span>
              </div>
              <h4 className="text-lg font-bold text-white mt-1">Nurettin Karaoğuz Vakfı Anadolu Lisesi</h4>
              <p className="text-xs text-cyan-300 font-mono mb-3">Sayısal Alan</p>
              <p className="text-xs text-slate-300 pt-3 border-t border-slate-800/80 leading-relaxed">
                Lise eğitimini <strong>okul birinciliği</strong> ile tamamlayarak analitik düşünme, algoritma ve yazılım disiplininin temelini burada inşa ettim.
              </p>
            </div>
          </div>
        </section>

        {/* KARİYER VE DENEYİM */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-6 text-cyan-400">
            <Server size={22} />
            <h3 className="text-2xl font-bold text-white">Profesyonel Deneyim & Kariyer</h3>
          </div>

          <div className="space-y-4">
            {/* ABB */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  Ankara Büyükşehir Belediyesi
                  <span className="text-xs bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full font-mono">
                    Devam Ediyor
                  </span>
                </h4>
                <span className="text-xs font-mono text-slate-400">2026 — Günümüz</span>
              </div>
              <p className="text-xs font-mono text-cyan-400 mb-2">Full-Stack Software Engineer & DevOps</p>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Belediyecilik ve kurum ölçeğindeki yüksek trafikli servislerin .NET Web API ve modern arayüz mimarileriyle geliştirilmesi; Docker, MinIO S3 uyumlu depolama, WSL ortamları ve CI/CD altyapılarının yönetimi.
              </p>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px] text-cyan-300">
                <span className="bg-slate-800 px-2 py-0.5 rounded">.NET Core</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded">Docker</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded">MinIO</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded">PostgreSQL</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded">DevOps</span>
              </div>
            </div>

            {/* TÜBİTAK */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                <h4 className="text-lg font-bold text-white">TÜBİTAK Proje Grubu</h4>
                <span className="text-xs font-mono text-slate-400">2025 — 2026 (1 Yıl)</span>
              </div>
              <p className="text-xs font-mono text-indigo-400 mb-2">Web3 & Blockchain Araştırmacısı / Geliştirici</p>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Ethereum ağı üzerinde Solidity ile güvenli ve ölçeklenebilir akıllı sözleşmelerin mimarisi; IPFS protokolü ile merkeziyetsiz, değiştirilemez veri saklama ve doğrulama yapısı.
              </p>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px] text-indigo-300">
                <span className="bg-slate-800 px-2 py-0.5 rounded">Solidity</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded">Ethereum</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded">IPFS</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded">Smart Contracts</span>
              </div>
            </div>

            {/* Başarsoft */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                <h4 className="text-lg font-bold text-white">Başarsoft Bilgi Teknolojileri</h4>
                <span className="text-xs font-mono text-slate-400">2024 — 2025</span>
              </div>
              <p className="text-xs font-mono text-emerald-400 mb-2">GIS / CBS Yazılım Mühendisi Stajyeri</p>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Harita tabanlı CBS web uygulamaları. OpenLayers ve PostGIS ile Point, LineString, Polygon çizimleri, dinamik rota planlama, adres arama ve geocoding/reverse-geocoding servisleri.
              </p>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px] text-emerald-300">
                <span className="bg-slate-800 px-2 py-0.5 rounded">OpenLayers</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded">PostGIS</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded">CBS / GIS</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded">GeoJSON</span>
              </div>
            </div>

            {/* Kırklareli Üniversitesi */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                <h4 className="text-lg font-bold text-white">Kırklareli Üniversitesi</h4>
                <span className="text-xs font-mono text-slate-400">2024 — 2025 (2 Yıl)</span>
              </div>
              <p className="text-xs font-mono text-sky-400 mb-2">Yarı Zamanlı Yazılım Mühendisi</p>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Üniversitenin kurumsal ve resmi web uygulamalarının backend mimarisi ve kullanıcı arayüzleri; akademik ve idari departmanlar için web tabanlı iç işleyiş otomasyonları.
              </p>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px] text-sky-300">
                <span className="bg-slate-800 px-2 py-0.5 rounded">Web Portalları</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded">İç Otomasyonlar</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded">Full-Stack</span>
              </div>
            </div>
          </div>
        </section>

        {/* BENTO GRID (DİLLER & ALTYAPILAR) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
            <Code2 className="text-cyan-400 mb-4" size={26} />
            <h4 className="text-lg font-semibold mb-2">Programlama Dilleri & Core</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              C#, Python, Java, JavaScript, Kotlin, C, C++, PHP, SQL dillerinde nesne yönelimli, temiz ve test edilebilir mimari geliştirme.
            </p>
            <div className="flex flex-wrap gap-1.5 font-mono text-[11px] text-cyan-300">
              <span className="bg-slate-800 px-2 py-0.5 rounded">C#</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded">Python</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded">Java</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded">Kotlin</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded">SQL</span>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
            <Database className="text-indigo-400 mb-4" size={26} />
            <h4 className="text-lg font-semibold mb-2">Veritabanı & GIS Mekânsal Analiz</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              PostgreSQL, PostGIS, Neon DB Serverless, MySQL, MS SQL, NoSQL veritabanları; OpenLayers, Leaflet ve NetTopologySuite analizleri.
            </p>
            <div className="flex flex-wrap gap-1.5 font-mono text-[11px] text-indigo-300">
              <span className="bg-slate-800 px-2 py-0.5 rounded">PostgreSQL</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded">PostGIS</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded">Neon DB</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded">OpenLayers</span>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
            <Server className="text-sky-400 mb-4" size={26} />
            <h4 className="text-lg font-semibold mb-2">Modern Web, DevOps & Yapay Zeka</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              ASP.NET Core, React, Docker, MinIO S3, CI/CD; Derin Öğrenme (CNN, RNN), Doğal Dil İşleme (BERT, T5, NLP) ve OpenCV bilgisayarlı görü.
            </p>
            <div className="flex flex-wrap gap-1.5 font-mono text-[11px] text-sky-300">
              <span className="bg-slate-800 px-2 py-0.5 rounded">ASP.NET Core</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded">React</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded">Docker</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded">PyTorch / BERT</span>
            </div>
          </div>
        </div>

        {/* CANLI VE SEÇKİN PROJELER */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-6 text-cyan-400">
            <Code2 size={22} />
            <h3 className="text-2xl font-bold text-white">Hayata Geçirdiğimiz Seçkin Projeler</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-cyan-500/50 transition-all">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">Bulut Klinik Sistemi</span>
                  <a href="https://github.com/HAMZA-CAN-ALTINTOP" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-cyan-400 text-xs font-mono">
                    İncele ↗
                  </a>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">DentalCloud Platformu</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Klinik ve hastane süreçleri için randevu, hasta takibi ve faturalandırma modülleri. .NET Web API ve Neon Serverless PostgreSQL mimarisi.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-1 text-[11px] font-mono text-slate-300">
                <span>C#</span> • <span>.NET Core</span> • <span>PostgreSQL</span>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-cyan-500/50 transition-all">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">Yapay Zeka / NLP</span>
                  <a href="https://github.com/HAMZA-CAN-ALTINTOP" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-400 text-xs font-mono">
                    İncele ↗
                  </a>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Tıbbi Chatbot & Arama Motoru</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Medikal veri setlerinde BERT ve T5 modelleriyle karmaşık sağlık sorularını yanıtlayan ve doğal dilde akıcı konuşan hibrit yapay zeka sistemi.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-1 text-[11px] font-mono text-slate-300">
                <span>Python</span> • <span>BERT</span> • <span>T5</span> • <span>NLP</span>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-cyan-500/50 transition-all">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">Web3 / IPFS</span>
                  <a href="https://github.com/HAMZA-CAN-ALTINTOP" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-emerald-400 text-xs font-mono">
                    İncele ↗
                  </a>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Blockchain Diploma Tescili</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Ethereum akıllı sözleşmeleri ve IPFS Kubo RPC protokolü ile diploma evraklarının sahteciliğe karşı merkeziyetsiz doğrulanması.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-1 text-[11px] font-mono text-slate-300">
                <span>Solidity</span> • <span>Ethereum</span> • <span>IPFS</span>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-cyan-500/50 transition-all">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">Ticari E-Ticaret</span>
                  <a href="https://github.com/HAMZA-CAN-ALTINTOP" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-cyan-400 text-xs font-mono">
                    İncele ↗
                  </a>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">E-Ticaret & Stok Sistemi</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Gelişmiş sepet, anlık stok takip, dinamik ürün listeleme ve güvenli ödeme akışına sahip full-stack e-ticaret altyapısı.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-1 text-[11px] font-mono text-slate-300">
                <span>ASP.NET Core</span> • <span>React</span> • <span>SQL</span>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-cyan-500/50 transition-all">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">Otomasyon</span>
                  <a href="https://github.com/HAMZA-CAN-ALTINTOP" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-400 text-xs font-mono">
                    İncele ↗
                  </a>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Kafe & Masa Otomasyonu</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Karekodlu sipariş alma, masa transferi, mutfak ekranı ve stok kontrolü sunan yüksek performanslı işletme yönetim yazılımı.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-1 text-[11px] font-mono text-slate-300">
                <span>C# .NET</span> • <span>PostgreSQL</span> • <span>Docker</span>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-cyan-500/50 transition-all">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">Mekânsal Harita</span>
                  <a href="https://github.com/HAMZA-CAN-ALTINTOP" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-emerald-400 text-xs font-mono">
                    İncele ↗
                  </a>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">GIS Uzamsal Harita Servisi</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  OpenLayers ile interaktif çizim araçları, PostGIS koordinat sorguları ve NetTopologySuite geometrik hesaplama entegrasyonu.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-1 text-[11px] font-mono text-slate-300">
                <span>OpenLayers</span> • <span>PostGIS</span> • <span>NetTopology</span>
              </div>
            </div>
          </div>
        </section>

        {/* İLETİŞİM FORMU (BOT KORUMALI) */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-xl">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-cyan-950/50 border border-cyan-800 text-cyan-400 mb-3">
              <MessageSquare size={22} />
            </div>
            <h3 className="text-3xl font-bold mb-2">Bizimle İletişime Geçin</h3>
            <p className="text-slate-400 text-sm">
              Proje detaylarınızı veya danışmanlık taleplerinizi iletin; doğrudan e-postama tablo düzeninde düşsün, aynı gün içinde dönüş sağlayalım.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
            
            {/* GÖRÜNMEZ BOT TUZAĞI (HONEYPOT) - İNSANLAR GÖRMEZ, BOTLAR DOLDURUR */}
            <input 
              type="text" 
              name="honeypot_field" 
              value={honeypot} 
              onChange={e => setHoneypot(e.target.value)} 
              style={{ display: 'none' }} 
              tabIndex={-1} 
              autoComplete="off" 
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-400 mb-1 flex items-center gap-1.5">
                  <User size={12} /> Adınız Soyadınız *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ahmet Yılmaz"
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 mb-1 flex items-center gap-1.5">
                  <Mail size={12} /> E-Posta Adresiniz *
                </label>
                <input
                  required
                  type="email"
                  placeholder="ahmet@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-400 mb-1 flex items-center gap-1.5">
                  <Phone size={12} /> Telefon (11 Hane) *
                </label>
                <input
                  required
                  type="tel"
                  maxLength={11}
                  placeholder="05xxxxxxxxx"
                  value={form.phone}
                  onChange={e => {
                    const onlyNums = e.target.value.replace(/\D/g, '');
                    if (onlyNums.length <= 11) {
                      setForm({ ...form, phone: onlyNums });
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 mb-1">Konu Başlığı</label>
                <select
                  value={form.topic}
                  onChange={e => setForm({ ...form, topic: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-300"
                >
                  <option value="Özel Web & Randevu Sitesi">Özel Web & Randevu Sitesi</option>
                  <option value="E-Ticaret Platformu">E-Ticaret Platformu Geliştirme</option>
                  <option value="Hastane & Klinik Otomasyonu">Hastane / Klinik Otomasyonu</option>
                  <option value="Kafe & Restoran Stok Otomasyonu">Kafe & Restoran Stok Otomasyonu</option>
                  <option value="İlan Sitesi (Emlak/Vasıta)">İlan Sitesi (Emlak/Vasıta)</option>
                  <option value="GIS ve Harita">GIS / CBS Harita Çözümleri</option>
                  <option value="Teknik Danışmanlık">Sistem Mimari Danışmanlığı</option>
                  <option value="İş Teklifi">İş / Kariyer Teklifi</option>
                  <option value="Genel Soru">Genel Soru</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 mb-1">Mesajınız *</label>
              <textarea
                required
                rows={4}
                placeholder="Fikrinizden, gereksinimlerinizden veya hayata geçirmek istediğiniz sistemden bahsedin..."
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className="w-full bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2 shadow-lg shadow-cyan-500/10"
            >
              {loading ? 'İletiliyor...' : cooldown > 0 ? `Lütfen Bekleyin (${cooldown}s)` : <>Mesajı Gönder <Send size={16} /></>}
            </button>

            {successMsg && (
              <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm bg-emerald-950/30 border border-emerald-800/50 py-3 rounded-xl mt-3">
                <CheckCircle2 size={18} /> {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center justify-center gap-2 text-rose-400 text-sm bg-rose-950/30 border border-rose-800/50 py-3 rounded-xl mt-3">
                <AlertCircle size={18} /> {errorMsg}
              </div>
            )}
          </form>
        </section>

        {/* Footer */}
        <footer className="mt-16 text-center text-xs text-slate-400 font-mono">
          © {new Date().getFullYear()} Hamza Can Altıntop. Tüm hakları saklıdır.
        </footer>
      </main>
    </div>
  );
}