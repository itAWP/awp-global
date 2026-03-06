import React from 'react';
import Image from 'next/image';

/**
 * ProcessStep4 Component
 * 
 * Clones the final process step card "Finalizing the Role" with "{ 1–5 Week. }"
 * featuring glassmorphism styles and a candidate selection interface.
 */
const ProcessStep4 = () => {
  // Candidate data based on the screenshots/content
  const candidates = [
    {
      id: 1,
      name: 'Mia Finn',
      role: 'Growth Marketing',
      img: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/bfb614be-ec28-4432-9686-db895df48786-highflyers-ai/assets/images/uzUVoBcBxYUh1Wt1YbbiDRaZc-9.png',
    },
    {
      id: 2,
      name: 'Ethan Ross',
      role: 'Head of Operations',
      img: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/bfb614be-ec28-4432-9686-db895df48786-highflyers-ai/assets/images/gnYJUCtaoqWBvxyVEKekhcAcRE-10.png',
    },
    {
      id: 3,
      name: 'Caleb Turner',
      role: 'VP Product Design',
      img: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/bfb614be-ec28-4432-9686-db895df48786-highflyers-ai/assets/images/SAkCrkvy9spbgSob6zcRHsUEcB8-6.png',
    },
  ];

  return (
    <section className="flex flex-col items-center justify-center py-[60px] w-full">
      <div className="glass-card w-full max-w-[440px] px-[40px] py-[60px] flex flex-col items-center text-center relative overflow-hidden min-h-[700px]">
        {/* Timeline Badge */}
        <div className="mb-[15px]">
          <span className="timeline-badge font-mono text-[14px]">
            {`{ 1–5 Week. }`}
          </span>
        </div>

        {/* Card Title */}
        <h4 className="text-[#ffffff] text-[32px] font-medium leading-[1.2] tracking-[-0.02em] mb-[40px]">
          Finalizing the Role
        </h4>

        {/* 3D-styled Visual Element Container */}
        <div className="relative w-full aspect-square mb-[40px] flex items-center justify-center">
          {/* Main Glass Sphere background element */}
          <div className="absolute inset-0 bg-white/10 rounded-full blur-[40px] transform scale-90" />
          
          {/* Candidate Dashboard Floating Interface */}
          <div className="relative z-10 w-full flex flex-col gap-3">
            {candidates.map((candidate, idx) => (
              <div 
                key={candidate.id}
                className="flex items-center justify-between bg-white/10 backdrop-blur-md border border-white/20 rounded-[24px] p-3 shadow-lg transform transition-all hover:scale-[1.02]"
                style={{ 
                  marginLeft: idx === 1 ? '10px' : '0px',
                  width: '95%',
                  alignSelf: idx === 1 ? 'flex-end' : 'flex-start'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 overflow-hidden rounded-full border border-white/30">
                    <Image 
                      src={candidate.img} 
                      alt={candidate.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="text-left">
                    <p className="text-white text-[14px] font-semibold leading-tight">{candidate.name}</p>
                    <p className="text-white/60 text-[11px] leading-tight mt-0.5">{candidate.role}</p>
                  </div>
                </div>
                <button className="bg-white/20 hover:bg-white/30 transition-colors text-white text-[12px] px-4 py-1.5 rounded-full border border-white/20 font-medium">
                  Invite
                </button>
              </div>
            ))}

            {/* Selected Highlighting Row */}
            <div className="flex items-center justify-between bg-white/30 backdrop-blur-xl border border-white/40 rounded-[28px] p-4 shadow-2xl mt-4 w-[105%] -ml-[2.5%] relative z-20">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 overflow-hidden rounded-full border-2 border-white/60">
                   <div className="absolute inset-0 bg-[#6085b3] opacity-20" />
                   <Image 
                      src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/bfb614be-ec28-4432-9686-db895df48786-highflyers-ai/assets/images/uzUVoBcBxYUh1Wt1YbbiDRaZc-9.png" 
                      alt="Liam Hayes"
                      fill
                      className="object-cover"
                    />
                </div>
                <div className="text-left">
                  <p className="text-white text-[16px] font-bold leading-tight">Liam Hayes</p>
                  <p className="text-white/80 text-[12px] leading-tight mt-0.5">Machine Learning Lead</p>
                </div>
              </div>
              <button className="bg-white text-[#6085b3] text-[13px] px-6 py-2 rounded-full font-bold shadow-sm hover:bg-opacity-90 transition-opacity">
                Invite
              </button>
            </div>
          </div>
        </div>

        {/* Description Text */}
        <p className="text-[#ffffff] text-[16px] font-normal leading-[1.6]">
          From our experience, a successful hiring process usually takes about 35 days to conclude.
        </p>

        {/* Low-opacity step number background label */}
        <div className="absolute bottom-[-10px] right-[-10px] text-step-number select-none pointer-events-none text-white font-semibold">
          04
        </div>
      </div>
    </section>
  );
};

export default ProcessStep4;