import { Suspense } from "react";
import { LoginForm } from "./login-form";

export function LoginCard() {
  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="mb-9 text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl heritage-button-primary ring-1 ring-white/20">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
          </svg>
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: "var(--accent)" }}>Restaurant POS</p>
        <h1 className="heritage-heading mt-2 text-4xl font-bold tracking-normal" style={{ color: "var(--text)" }}>Welcome back</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Access the platform console or your restaurant workspace.
        </p>
      </div>

      <div className="heritage-card rounded-2xl p-5 sm:p-6">
        <Suspense fallback={<div className="py-8 text-center text-sm" style={{ color: "var(--muted)" }}>Loading secure connection...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
