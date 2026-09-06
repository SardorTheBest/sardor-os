import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  alpha: number;
  pulseSpeed: number;
  pulseVal: number;
}

export const AICursorCanvas: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number; isHovered: boolean }>({
    x: -1000,
    y: -1000,
    targetX: -1000,
    targetY: -1000,
    isHovered: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 200);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        width = canvas.width = entry.contentRect.width;
        height = canvas.height = entry.contentRect.height;
      }
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Colors: Cyber Mint, Quantum Cyan, Deep Purple, Electric Gold
    const colors = ['#00ffab', '#00e5ff', '#d0bcff', '#4edea3', '#89ceff'];

    // Generate particles
    const particleCount = Math.min(65, Math.floor((width * height) / 4500));
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 2 + 1,
        baseRadius: Math.random() * 2 + 1,
        color,
        alpha: Math.random() * 0.6 + 0.3,
        pulseSpeed: Math.random() * 0.03 + 0.01,
        pulseVal: Math.random() * Math.PI,
      });
    }

    // Track mouse with smooth lerp
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.targetX = e.clientX - rect.left;
      mouseRef.current.targetY = e.clientY - rect.top;
      mouseRef.current.isHovered = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.isHovered = false;
    };

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener('mousemove', handleMouseMove);
      parent.addEventListener('mouseleave', handleMouseLeave);
    }

    let time = 0;

    const render = () => {
      time += 0.015;

      // Smooth mouse lerp
      if (mouseRef.current.isHovered) {
        mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.12;
        mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.12;
      } else {
        mouseRef.current.x += (-1000 - mouseRef.current.x) * 0.05;
        mouseRef.current.y += (-1000 - mouseRef.current.y) * 0.05;
      }

      ctx.clearRect(0, 0, width, height);

      // Render glowing cursor aura
      if (mouseRef.current.isHovered && mouseRef.current.x > 0 && mouseRef.current.y > 0) {
        const radialGradient = ctx.createRadialGradient(
          mouseRef.current.x,
          mouseRef.current.y,
          0,
          mouseRef.current.x,
          mouseRef.current.y,
          180
        );
        radialGradient.addColorStop(0, 'rgba(0, 255, 171, 0.25)');
        radialGradient.addColorStop(0.3, 'rgba(0, 229, 255, 0.15)');
        radialGradient.addColorStop(0.7, 'rgba(147, 51, 234, 0.06)');
        radialGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = radialGradient;
        ctx.beginPath();
        ctx.arc(mouseRef.current.x, mouseRef.current.y, 180, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render ambient aurora waves in background
      const waveGrad = ctx.createLinearGradient(0, 0, width, height);
      waveGrad.addColorStop(0, 'rgba(0, 255, 171, 0.03)');
      waveGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.04)');
      waveGrad.addColorStop(1, 'rgba(147, 51, 234, 0.03)');
      ctx.fillStyle = waveGrad;
      ctx.fillRect(0, 0, width, height);

      // Update & render particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Natural floating movement
        p.x += p.vx;
        p.y += p.vy;

        // Pulse size
        p.pulseVal += p.pulseSpeed;
        p.radius = p.baseRadius + Math.sin(p.pulseVal) * 0.8;

        // Bounce boundaries
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Mouse attraction & repulsion physics
        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) {
          const force = (150 - dist) / 150;
          p.x -= (dx / dist) * force * 1.5;
          p.y -= (dy / dist) * force * 1.5;
        }

        // Draw particle node
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.radius), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();

        // Connect particles with neural lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist2 = Math.hypot(p.x - p2.x, p.y - p2.y);

          if (dist2 < 90) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = (1 - dist2 / 90) * 0.18;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Connect to mouse cursor with magnetic energy beams
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
          ctx.strokeStyle = '#00ffab';
          ctx.globalAlpha = (1 - dist / 120) * 0.4;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (parent) {
        parent.removeEventListener('mousemove', handleMouseMove);
        parent.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none w-full h-full z-0 ${className}`}
    />
  );
};
