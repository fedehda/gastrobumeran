"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DirectCajaRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Look up the local restaurant slug and redirect directly to its terminal
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        const slug = data.branding?.slug || data.restaurant?.slug || "mi-resto";
        router.replace(`/r/${slug}/caja`);
      })
      .catch(() => {
        router.replace("/r/mi-resto/caja");
      });
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3 text-slate-400">
      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs">Abriendo terminal de caja del local...</p>
    </div>
  );
}
