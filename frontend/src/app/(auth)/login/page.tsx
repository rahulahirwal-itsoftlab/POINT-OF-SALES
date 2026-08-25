import { LoginCard } from "@/features/auth/components/login-card";
import { LoginVideoPanel } from "@/features/auth/components/login-video-panel";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen overflow-hidden lg:grid-cols-[52%_48%]" style={{ background: "var(--background)", color: "var(--text)" }}>
      <LoginVideoPanel />
      <div className="flex w-full items-center justify-center p-6 sm:p-10 lg:p-12" style={{ background: "var(--surface)" }}>
        <LoginCard />
      </div>
    </main>
  );
}
