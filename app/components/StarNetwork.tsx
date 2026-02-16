/**
 * StarNetwork - Interactive particle constellation canvas
 *
 * Renders a full-screen canvas with floating particles (stars) that form
 * connection lines when near each other. Particles within a radius of the
 * mouse cursor are attracted toward it and glow brighter, creating a
 * responsive network effect that follows the user's pointer.
 *
 * Used by: /desktop, /login, /signup pages
 *
 * Performance: uses requestAnimationFrame, resizes with the viewport,
 * cleans up listeners on unmount.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  /** Base opacity (0-1) */
  opacity: number;
}

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

const PARTICLE_COUNT = 120;
const MAX_LINK_DIST = 140;
const MOUSE_RADIUS = 200;
const MOUSE_ATTRACT_STRENGTH = 0.012;
const BASE_SPEED = 0.25;
const PARTICLE_MIN_R = 1;
const PARTICLE_MAX_R = 2.4;
const LINE_COLOR = '45, 134, 89';   // --color-primary rgb
const DOT_COLOR = '45, 134, 89';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StarNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const mouse = useRef({ x: -9999, y: -9999 });
  const animRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });

  // ---- Helpers ----

  const initParticles = useCallback((w: number, h: number) => {
    const arr: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * BASE_SPEED * 2,
        vy: (Math.random() - 0.5) * BASE_SPEED * 2,
        radius: PARTICLE_MIN_R + Math.random() * (PARTICLE_MAX_R - PARTICLE_MIN_R),
        opacity: 0.3 + Math.random() * 0.5,
      });
    }
    particles.current = arr;
  }, []);

  // ---- Animation loop ----

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = sizeRef.current;
    ctx.clearRect(0, 0, w, h);

    const pts = particles.current;
    const mx = mouse.current.x;
    const my = mouse.current.y;

    // Update positions
    for (const p of pts) {
      // Mouse attraction
      const dx = mx - p.x;
      const dy = my - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_RADIUS && dist > 0) {
        const force = (1 - dist / MOUSE_RADIUS) * MOUSE_ATTRACT_STRENGTH;
        p.vx += dx * force;
        p.vy += dy * force;
      }

      // Damping
      p.vx *= 0.98;
      p.vy *= 0.98;

      // Clamp speed
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const maxSpeed = BASE_SPEED * 3;
      if (speed > maxSpeed) {
        p.vx = (p.vx / speed) * maxSpeed;
        p.vy = (p.vy / speed) * maxSpeed;
      }

      p.x += p.vx;
      p.y += p.vy;

      // Wrap edges
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;
    }

    // Draw links
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < MAX_LINK_DIST) {
          const alpha = (1 - d / MAX_LINK_DIST) * 0.25;
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(${LINE_COLOR}, ${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    // Draw particles
    for (const p of pts) {
      const dx = mx - p.x;
      const dy = my - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nearMouse = dist < MOUSE_RADIUS;
      const glow = nearMouse ? 1 - dist / MOUSE_RADIUS : 0;

      const alpha = p.opacity + glow * 0.5;
      const r = p.radius + glow * 1.5;

      // Outer glow when near mouse
      if (glow > 0.2) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${DOT_COLOR}, ${glow * 0.15})`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${DOT_COLOR}, ${Math.min(alpha, 1)})`;
      ctx.fill();
    }

    animRef.current = requestAnimationFrame(draw);
  }, []);

  // ---- Setup / teardown ----

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      ctx?.scale(dpr, dpr);
      sizeRef.current = { w, h };

      if (particles.current.length === 0) {
        initParticles(w, h);
      }
    };

    const onMouse = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseLeave = () => {
      mouse.current = { x: -9999, y: -9999 };
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('mouseleave', onMouseLeave);

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [draw, initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
