import React from 'react';
import Image from 'next/image';

/**
 * ProcessStep2 Component
 * Clones the "Job Scorecard & Candidate Presentation" step card from the Highflyers website.
 * Features: Glassmorphism, specific 3D sphere asset with nested candidate icons, and timeline badge.
 */
const ProcessStep2 = () => {
  // Asset provided in the prompt for this specific section
  const sphereAsset = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/bfb614be-ec28-4432-9686-db895df48786-highflyers-ai/assets/images/rZw1Ys17ev3BXFirE1BETwOOOk-4.png";

  return (
    <div className="flex justify-center w-full py-[30px]">
      <div 
        className="glass-card relative flex flex-col items-center w-full max-w-[440px] p-[40px] text-center"
        style={{
          backgroundColor: 'rgba(153, 191, 222, 0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          borderRadius: '40px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Step Number Background Accent */}
        <div 
          className="absolute top-4 right-8 select-none pointer-events-none"
          style={{
            fontSize: '80px',
            fontWeight: 600,
            color: '#6085b3',
            opacity: 0.1,
            letterSpacing: '-0.05em',
            fontFamily: '"Inter", sans-serif'
          }}
        >
          02
        </div>

        {/* Timeline Badge */}
        <div className="mb-[24px]">
          <span 
            className="timeline-badge"
            style={{
              fontFamily: '"Monaco", "Lucida Console", monospace',
              fontSize: '14px',
              color: '#94a3b8',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              padding: '4px 16px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              letterSpacing: '0.05em'
            }}
          >
            &#123; 1–3 Day. &#125;
          </span>
        </div>

        {/* Card Title */}
        <h4 
          className="mb-[32px] max-w-[320px]"
          style={{
            fontSize: '32px',
            fontWeight: 500,
            lineHeight: 1.2,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            fontFamily: '"Inter", sans-serif'
          }}
        >
          Job Scorecard &amp; Candidate Presentation
        </h4>

        {/* 3D Sphere Graphic Area */}
        <div className="relative w-full aspect-square max-w-[280px] mb-[40px] flex items-center justify-center">
          <Image
            src={sphereAsset}
            alt="Translucent glass sphere with candidate metrics"
            width={280}
            height={280}
            className="object-contain"
            priority
          />
          
          {/* Note: The screenshot shows floating icons like search/user/checked inside/around the sphere. 
              The provided asset 'rZw1Ys17ev3BXFirE1BETwOOOk-4.png' typically includes these elements 
              baked into the 3D render for highflyers clones. */}
        </div>

        {/* Card Description */}
        <p 
          className="text-white text-opacity-90 leading-[1.6]"
          style={{
            fontSize: '16px',
            fontWeight: 400,
            fontFamily: '"Inter", sans-serif'
          }}
        >
          We help you identify the specific skills, qualifications and assessments required for your goals. 
          We conduct outreach, interviews and references to evaluate candidates thoroughly, 
          and recruit the ideal talent to drive your success.
        </p>
      </div>
    </div>
  );
};

export default ProcessStep2;