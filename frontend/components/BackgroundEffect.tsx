'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/* ── Particle canvas background ──────────────────────────── */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      color: string;
      pulse: number;
      pulseSpeed: number;
    }[] = [];

    const COLORS = [
      'rgba(59, 130, 246,',   // blue
      'rgba(99, 102, 241,',   // indigo
      'rgba(0, 82, 255,',     // base blue
      'rgba(16, 185, 129,',   // emerald
    ];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    const count = Math.min(60, Math.floor((window.innerWidth * window.innerHeight) / 25000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.01 + Math.random() * 0.02,
      });
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      for (const p of particles) {
        // Move
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        // Wrap around edges
        if (p.x < -10) p.x = canvas!.width + 10;
        if (p.x > canvas!.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas!.height + 10;
        if (p.y > canvas!.height + 10) p.y = -10;

        // Pulsing opacity
        const currentOpacity = p.opacity * (0.5 + 0.5 * Math.sin(p.pulse));

        // Draw glow
        const gradient = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        gradient.addColorStop(0, `${p.color} ${currentOpacity})`);
        gradient.addColorStop(1, `${p.color} 0)`);
        ctx!.fillStyle = gradient;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx!.fill();

        // Draw core dot
        ctx!.fillStyle = `${p.color} ${currentOpacity * 1.5})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Draw connections between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            const lineOpacity = (1 - dist / 150) * 0.06;
            ctx!.strokeStyle = `rgba(59, 130, 246, ${lineOpacity})`;
            ctx!.lineWidth = 0.5;
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.7 }}
    />
  );
}

/* ── Aurora gradient waves ───────────────────────────────── */
function AuroraWaves() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Top aurora */}
      <div
        className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[150%] h-[80%] rounded-full opacity-[0.03]"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, #0052FF 30%, #6366f1 50%, transparent 70%)',
          animation: 'aurora-shift 12s ease-in-out infinite',
        }}
      />
      {/* Bottom aurora */}
      <div
        className="absolute -bottom-1/2 left-1/2 -translate-x-1/2 w-[120%] h-[60%] rounded-full opacity-[0.025]"
        style={{
          background: 'linear-gradient(0deg, transparent 0%, #10b981 40%, #3b82f6 60%, transparent 80%)',
          animation: 'aurora-shift 15s ease-in-out infinite reverse',
        }}
      />
      {/* Center glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle, #0052FF 0%, transparent 70%)',
          animation: 'aurora-pulse 8s ease-in-out infinite',
        }}
      />
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────── */
export default function BackgroundEffects() {
  const pathname = usePathname();

  // Overlay page must stay fully transparent for OBS
  if (pathname?.startsWith('/overlay/')) return null;

  return (
    <>
      <AuroraWaves />
      <ParticleField />
    </>
  );
}
