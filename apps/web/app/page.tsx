"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if logged in, otherwise to login
    if (api.getToken()) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Coordi - AI Voice Receptionist
        </h1>
        <p className="text-center text-muted-foreground">
          Redirecting...
        </p>
      </div>
    </main>
  );
}


