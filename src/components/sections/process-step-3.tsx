import React from 'react';
import Image from 'next/image';

/**
 * ProcessStep3 component - Clones the "Regular Updates" step card.
 * 
 * Design Instructions:
 * Clone the third process step card "Regular Updates" marked with "{ 2–5 Week. }", 
 * displaying integrated app icons like Google, WhatsApp, Slack, and Microsoft inside a glass sphere.
 */

const ProcessStep3: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-[60px] w-full">
      <div 
        className="glass-card flex flex-col items-center w-full max-w-[440px] px-[40px] py-[40px] text-center relative overflow-hidden"
        style={{
          background: 'rgba(153, 191, 222, 0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '40px',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Timeline Badge */}
        <div className="mb-[24px]">
          <span 
            className="timeline-badge"
            style={{
              fontFamily: '"Monaco", ui-monospace, SFMono-Regular, monospace',
              fontSize: '14px',
              color: '#94A3B8',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              padding: '4px 12px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              letterSpacing: '0.05em',
            }}
          >
            {'{ 2–5 Week. }'}
          </span>
        </div>

        {/* Card Title */}
        <h4 
          className="mb-[32px]"
          style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '32px',
            fontWeight: 500,
            lineHeight: '1.2em',
            letterSpacing: '-0.02em',
            color: '#FFFFFF',
          }}
        >
          Regular Updates
        </h4>

        {/* 3D Asset Container - Glass Sphere with Icons */}
        <div className="relative w-full aspect-square max-w-[260px] mb-[32px] flex items-center justify-center">
          {/* Main Glass Sphere Asset */}
          <div className="relative w-full h-full transform transition-transform duration-700 hover:scale-105">
            <Image
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/bfb614be-ec28-4432-9686-db895df48786-highflyers-ai/assets/images/StRxEp0PNKvpr54VbcTxBgHZmg4-5.png"
              alt="Floating app icons in glass sphere"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Description Text */}
        <p 
          style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '16px',
            fontWeight: 400,
            lineHeight: '1.6em',
            color: '#FFFFFF',
            textAlign: 'center',
          }}
        >
          Communication is key in staying focused and aligned throughout the search. Together, we decide on an update schedule that works best for you, to help you stay informed on the search while you focus on your core business.
        </p>

        {/* Background Step Number Accent */}
        <div 
          className="absolute top-[-10px] right-[20px] select-none pointer-events-none"
          style={{
            fontSize: '80px',
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: '-0.05em',
            color: '#FFFFFF',
            opacity: 0.1,
          }}
        >
          03
        </div>
      </div>
    </div>
  );
};

export default ProcessStep3;