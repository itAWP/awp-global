import React from 'react';

/**
 * ProcessIntro component
 * This component clones the process introduction section featuring the "4 Simple Steps" heading, 
 * roadmap subtitle, and brief description of the recruitment strategy.
 * 
 * Based on the design requirements for pixel-perfect accuracy:
 * - Theme: Light
 * - Typography: Inter for headings/body, Monaco for badges
 * - Colors: #6085b3 for titles, #94a3b8 for secondary text
 */

export default function ProcessIntro() {
  return (
    <section className="flex flex-col items-center justify-center py-[120px] px-8 bg-white border-b border-transparent">
      <div className="max-w-[1200px] w-full flex flex-col items-center text-center">
        {/* Step Counter Heading */}
        <div className="mb-6">
          <h2 
            className="text-[48px] font-medium leading-[1.1] tracking-[-0.04em] text-[#6085b3]"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            4 Simple Steps
          </h2>
        </div>

        {/* Roadmap Subtitle */}
        <div className="mb-6 max-w-[800px]">
          <h4 
            className="text-[32px] font-medium leading-[1.2] tracking-[-0.02em] text-[#6085b3]"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            Your Roadmap to Building the Future with the Best Talent.
          </h4>
        </div>

        {/* Description Text */}
        <div className="max-w-[700px]">
          <p 
            className="text-[16px] leading-[1.6] text-[#94a3b8] font-normal"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            We guide you through every step — from defining your strategy to securing top professionals who will shape your success.
          </p>
        </div>

        {/* Subtle separator element based on visual hierarchy */}
        <div className="mt-12 w-[1px] h-[60px] bg-gradient-to-b from-[#6085b3]/20 to-transparent" />
      </div>
    </section>
  );
}