import React from 'react';
import Image from 'next/image';

/**
 * ProcessStepOne Component
 * Clones the "Kick-off Briefing" process step card with pixel-perfect accuracy.
 * Features: Light blue glass-morphism card, 3D glass asset, and specific typography.
 */
const ProcessStepOne: React.FC = () => {
  return (
    <section className="flex flex-col items-center justify-center py-[60px] w-full bg-white">
      <div 
        className="glass-card flex flex-col items-center text-center w-full max-w-[440px] min-h-[640px] px-10 py-[60px] relative overflow-hidden"
        style={{
          backgroundColor: 'rgba(153, 191, 222, 0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '40px',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Timeline Badge */}
        <div className="mb-8">
          <span 
            className="timeline-badge"
            style={{
              fontFamily: '"Monaco", ui-monospace, SFMono-Regular, monospace',
              fontSize: '14px',
              color: '#94a3b8',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              padding: '4px 12px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              letterSpacing: '0.05em'
            }}
          >
            {`{ 1 Day. }`}
          </span>
        </div>

        {/* Card Title */}
        <h4 
          className="mb-10 text-white"
          style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '32px',
            fontWeight: 500,
            lineHeight: '1.2',
            letterSpacing: '-0.02em'
          }}
        >
          Kick-off Briefing
        </h4>

        {/* 3D Glass Asset */}
        <div className="relative w-full aspect-square max-w-[280px] mb-10 flex items-center justify-center pointer-events-none">
          <Image
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/bfb614be-ec28-4432-9686-db895df48786-highflyers-ai/assets/images/LdGQpDtOg21PXpf9TFpaFZkLPtc-3.png"
            alt="3D Glass Communication Asset"
            width={280}
            height={280}
            className="object-contain"
            priority
          />
        </div>

        {/* Description Text */}
        <p 
          className="text-white opacity-90 text-left"
          style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '16px',
            fontWeight: 400,
            lineHeight: '1.6',
            letterSpacing: 'normal'
          }}
        >
          We closely work with your team to understand your business, industry, and role requirements, including collecting stakeholder input, defining the role's focus, and clarifying compensation details.
        </p>

        {/* Step Number Background Accent (Subtle Overlay) */}
        <div 
          className="absolute bottom-[-10px] right-[-10px] select-none pointer-events-none text-step-number"
          style={{
            fontSize: '120px',
            fontWeight: 600,
            color: 'white',
            opacity: 0.05,
            letterSpacing: '-0.05em'
          }}
        >
          01
        </div>
      </div>
    </section>
  );
};

export default ProcessStepOne;