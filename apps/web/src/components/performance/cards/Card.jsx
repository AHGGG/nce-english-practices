import React from "react";

/**
 * Card - Section wrapper with title and icon
 */
const Card = ({ title, icon: CardIcon, children }) => (
  <div className="relative bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl shadow-black/20 group hover:border-white/20 transition-all duration-300">
    {/* Background Gradient - Clipped */}
    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-accent-primary/5 blur-[100px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
    </div>

    <div className="relative z-10 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
          <CardIcon size={18} className="text-accent-primary opacity-80" />
        </div>
        <h3 className="font-serif font-bold text-white text-lg tracking-tight">
          {title}
        </h3>
      </div>
      <div>{children}</div>
    </div>
  </div>
);

export default Card;
