/**
 * StarNetwork - Interactive particle constellation canvas.
 */

'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

const PARTICLE_COUNT = 120;
const MAX_LINK_DIST = 140;
const MAX_LINK_DIST_SQ = MAX_LINK_DIST * MAX_LINK_DIST;
const MOUSE_RADIUS = 200;
const MOUSE_RADIUS_SQ = MOUSE_RADIUS * MOUSE_RADIUS;
const MOUSE_ATTRACT_STRENGTH = 0.012;
const BASE_SPEED = 0.25;
const PARTICLE_MIN_R = 1;
const PARTICLE_MAX_R = 2.4;
const LINE_COLOR = '45, 134, 89';
const DOT_COLOR = '45, 134, 89';
const OFFSCREEN = -9999;

function createParticles(w: number, h: number): Particle[] {
  const created: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    created.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * BASE_SPEED * 2,
      vy: (Math.random() - 0.5) * BASE_SPEED * 2,
      radius: PARTICLE_MIN_R + Math.random() * (PARTICLE_MAX_R - PARTICLE_MIN_R),
      opacity: 0.3 + Math.random() * 0.5,
    });
  }
  return created;
}

export default function StarNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: OFFSCREEN, y: OFFSCREEN });
  const animationFrameRef = useRef<number | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      sizeRef.current = { w, h };
      if (particlesRef.current.length === 0) {
        particlesRef.current = createParticles(w, h);
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      mouseRef.current = { x: event.clientX, y: event.clientY };
    };

    const onMouseLeave = () => {
      mouseRef.current = { x: OFFSCREEN, y: OFFSCREEN };
    };

    const draw = () => {
      const { w, h } = sizeRef.current;
      if (w === 0 || h === 0) {
        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      const particles = particlesRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        const dx = mx - particle.x;
        const dy = my - particle.y;
        const distSq = dx * dx + dy * dy;

        if (distSq > 0 && distSq < MOUSE_RADIUS_SQ) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / MOUSE_RADIUS) * MOUSE_ATTRACT_STRENGTH;
          particle.vx += dx * force;
          particle.vy += dy * force;
        }

        particle.vx *= 0.98;
        particle.vy *= 0.98;

        const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
        const maxSpeed = BASE_SPEED * 3;
        if (speed > maxSpeed) {
          particle.vx = (particle.vx / speed) * maxSpeed;
          particle.vy = (particle.vy / speed) * maxSpeed;
        }

        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -10) particle.x = w + 10;
        if (particle.x > w + 10) particle.x = -10;
        if (particle.y < -10) particle.y = h + 10;
        if (particle.y > h + 10) particle.y = -10;
      }

      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq >= MAX_LINK_DIST_SQ) continue;

          const dist = Math.sqrt(distSq);
          const alpha = (1 - dist / MAX_LINK_DIST) * 0.25;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${LINE_COLOR}, ${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        const dx = mx - particle.x;
        const dy = my - particle.y;
        const distSq = dx * dx + dy * dy;
        const nearMouse = distSq < MOUSE_RADIUS_SQ;
        const dist = nearMouse ? Math.sqrt(distSq) : MOUSE_RADIUS;
        const glow = nearMouse ? 1 - dist / MOUSE_RADIUS : 0;

        const alpha = particle.opacity + glow * 0.5;
        const radius = particle.radius + glow * 1.5;

        if (glow > 0.2) {
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, radius + 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${DOT_COLOR}, ${glow * 0.15})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${DOT_COLOR}, ${Math.min(alpha, 1)})`;
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseleave', onMouseLeave, { passive: true });

    animationFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
