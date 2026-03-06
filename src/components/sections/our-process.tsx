import React from 'react';
import Image from 'next/image';

interface ProcessStep {
  timeframe: string;
  title: string;
  description: string;
  image: string;
}

const processSteps: ProcessStep[] = [
  {
    timeframe: "1 Day.",
    title: "Kick-off Briefing",
    description: "We closely work with your team to understand your business, industry, and role requirements, including collecting stakeholder input, defining the role's focus, and clarifying compensation details.",
    image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/bfb614be-ec28-4432-9686-db895df48786-highflyers-ai/assets/images/LdGQpDtOg21PXpf9TFpaFZkLPtc-3.png"
  },
  {
    timeframe: "1–3 Day.",
    title: "Job Scorecard & Candidate Presentation",
    description: "We help you identify the specific skills, qualifications and assessments required for your goals. We conduct outreach, interviews and references to evaluate candidates thoroughly, and recruit the ideal talent to drive your success.",
    image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/bfb614be-ec28-4432-9686-db895df48786-highflyers-ai/assets/images/rZw1Ys17ev3BXFirE1BETwOOOk-4.png"
  },
  {
    timeframe: "2–5 Week.",
    title: "Regular Updates",
    description: "Communication is key in staying focused and aligned throughout the search. Together, we decide on an update schedule that works best for you, to help you stay informed on the search while you focus on your core business.",
    image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/bfb614be-ec28-4432-9686-db895df48786-highflyers-ai/assets/images/StRxEp0PNKvpr54VbcTxBgHZmg4-5.png"
  },
  {
    timeframe: "1–5 Week.",
    title: "Finalizing the Role",
    description: "From our experience, a successful hiring process usually takes about 35 days to conclude.",
    image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/bfb614be-ec28-4432-9686-db895df48786-highflyers-ai/assets/images/SAkCrkvy9spbgSob6zcRHsUEcB8-6.png"
  }
];

const ProcessCard = ({ step }: { step: ProcessStep }) => {
  return (
    <div className="glass-card w-full max-w-[420px] min-h-[640px] flex flex-col items-center p-12 text-center group">
      {/* Timeframe Tag */}
      <div className="mb-12">
        <span className="timeline-text px-4 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm">
          {`{ ${step.timeframe} }`}
        </span>
      </div>

      {/* Card Title */}
      <h3 className="process-title text-[32px] leading-tight mb-8">
        {step.title}
      </h3>

      {/* 3D Asset Wrapper */}
      <div className="flex-grow w-full flex items-center justify-center mb-8 relative">
        <div className="relative w-full h-full flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
           <Image
            src={step.image}
            alt={step.title}
            width={300}
            height={300}
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Description */}
      <p className="process-description text-[14px] leading-[1.6] opacity-90">
        {step.description}
      </p>
    </div>
  );
};

export default function OurProcess() {
  return (
    <section id="our-process" className="py-[120px] bg-white">
      <div className="container px-4 mx-auto">
        {/* Section Header */}
        <div className="text-center mb-20 max-w-2xl mx-auto">
          <p className="text-[16px] font-medium text-[#4A6072] uppercase tracking-[0.2em] mb-4">
            Our process
          </p>
          <h2 className="section-header text-[#2D3E50] mb-6">
            4 Simple Steps
          </h2>
          <p className="text-[#4A6072] text-[18px] leading-[1.6]">
            Your Roadmap to Building the Future with the Best Talent.
          </p>
        </div>

        {/* Process Cards Stack */}
        <div className="flex flex-col items-center gap-[40px]">
          {processSteps.map((step, index) => (
            <ProcessCard key={index} step={step} />
          ))}
        </div>
        
        {/* Bottom Decorative or Navigation Text */}
        <div className="mt-24 text-center">
            <p className="text-[#4A6072]/60 text-sm tracking-widest uppercase">
                Hiring Made Simple, Fast, and Clear.
            </p>
        </div>
      </div>

      <style jsx global>{`
        .glass-card {
          background: linear-gradient(180deg, #A0C0D4 0%, #8CAEC4 100%);
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 32px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .glass-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.2);
          pointer-events: none;
          z-index: 0;
        }

        .glass-card > * {
          position: relative;
          z-index: 1;
        }

        .timeline-text {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 400;
          letter-spacing: 0.05em;
          font-family: 'Inter', sans-serif;
        }

        .process-title {
          font-size: 32px;
          font-weight: 500;
          color: #FFFFFF;
          font-family: 'Inter', sans-serif;
          letter-spacing: -0.01em;
        }

        .process-description {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.95);
          line-height: 1.6;
          font-family: 'Inter', sans-serif;
        }

        .section-header {
          font-size: 48px;
          font-weight: 500;
          text-align: center;
          letter-spacing: -0.02em;
          color: #2D3E50;
        }
      `}</style>
    </section>
  );
}