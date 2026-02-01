import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Login() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/admin");
    }
  }, [user, setLocation]);

  if (isLoading) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md p-8 border-none shadow-xl text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-xl bg-primary text-white flex items-center justify-center font-display font-bold text-3xl">N</div>
        </div>
        
        <div>
          <h1 className="text-2xl font-display font-bold text-primary">Noviq Admin</h1>
          <p className="text-muted-foreground mt-2">Sign in to manage proposals</p>
        </div>

        <Button 
          className="w-full h-12 text-base font-semibold"
          onClick={() => window.location.href = '/api/login'}
        >
          Login with Replit
        </Button>
      </Card>
      
      <p className="mt-8 text-xs text-muted-foreground font-serif italic">
        Authorized personnel only.
      </p>
    </div>
  );
}
