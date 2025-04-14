'use client';

import React, {useEffect, useRef} from 'react';

const ParticleComponent = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<
    {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
    }[]
  >([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const initParticles = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particlesRef.current = [];

      const numberOfParticles = Math.floor(canvas.width * 0.05); // Adjust density as needed

      for (let i = 0; i < numberOfParticles; i++) {
        const size = Math.random() * 3 + 1;
        const x = Math.random() * (canvas.width - size * 2) + size;
        const y = Math.random() * (canvas.height - size * 2) + size;
        const speedX = (Math.random() - 0.5) * 0.5; // Reduced speed
        const speedY = (Math.random() - 0.5) * 0.5; // Reduced speed
        const color = '#2DD4BF'; // Teal color

        particlesRef.current.push({x, y, size, color, speedX, speedY});
      }
    };

    const drawParticles = () => {
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();

        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Bounce off edges
        if (particle.x + particle.size > canvas.width || particle.x - particle.size < 0) {
          particle.speedX = -particle.speedX;
        }
        if (particle.y + particle.size > canvas.height || particle.y - particle.size < 0) {
          particle.speedY = -particle.speedY;
        }
      });
    };

    const animate = () => {
      drawParticles();
      animationFrameId = requestAnimationFrame(animate);
    };

    initParticles();
    animate();

    const handleResize = () => {
      initParticles();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none', // Make sure it doesn't block interactions
      }}
    />
  );
};

export default ParticleComponent;
