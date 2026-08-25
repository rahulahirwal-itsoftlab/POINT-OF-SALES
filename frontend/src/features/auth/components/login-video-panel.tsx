"use client";

import { useState } from "react";

const loginVideoSrc = "/Waiter_serving_guests_at_restaurant_202608211300.mp4";

export function LoginVideoPanel() {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <section className="relative min-h-[16rem] overflow-hidden lg:min-h-screen" aria-label="Restaurant POS ambience">
      {!videoFailed ? (
        <video
          aria-hidden="true"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setVideoFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={loginVideoSrc} type="video/mp4" />
        </video>
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/auth-bg.jpg')" }}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-[#1a1512]/90 via-[#1a1512]/35 to-[#d4af37]/10" />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />

      <div className="relative flex h-full min-h-[16rem] flex-col justify-end p-6 text-[#fffaf0] sm:p-8 lg:min-h-screen lg:p-12">
        <div className="mb-5 inline-flex w-fit rounded-full border border-[#d4af37]/40 bg-black/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f1d77f]">
          Restaurant POS
        </div>
        <h2 className="heritage-heading max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
          Premium service, coordinated from one calm console.
        </h2>
        <p className="mt-4 max-w-md text-sm leading-6 text-[#f5efe6]/85">
          Manage tables, orders, kitchen flow, billing, and staff operations with a polished workspace built for busy restaurants.
        </p>
      </div>
    </section>
  );
}
