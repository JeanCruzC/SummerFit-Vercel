"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sparkles } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
        return;
      }

      window.location.href = "http://localhost:8501";
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white mx-auto mb-6 animate-pulse">
          <Sparkles className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Redirigiendo a tu dashboard...</h1>
        <p className="text-gray-600">Un momento por favor</p>
      </div>
    </div>
  );
}
