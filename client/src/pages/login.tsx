import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-neutral-text">Loading authentication status...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
              <path d="M10 8H30C35.523 8 40 12.477 40 18V22C40 27.523 35.523 32 30 32H10C4.477 32 0 27.523 0 22V18C0 12.477 4.477 8 10 8Z" fill="currentColor"/>
              <path d="M15 16L15 24" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M20 16L20 24" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M25 16L25 24" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M45 12H50V28H45V12Z" fill="currentColor"/>
              <path d="M53 12H58V15C59 13 61 12 63 12C67 12 70 15 70 19V28H65V20C65 18 64 17 62 17C60 17 58 18 58 21V28H53V12Z" fill="currentColor"/>
              <path d="M72 12H77V15C78 13 80 12 82 12C84 12 86 13 87 15C88 13 91 12 93 12C97 12 100 15 100 19V28H95V20C95 18 94 17 92 17C90 17 89 18 89 21V28H84V20C84 18 83 17 81 17C79 17 77 18 77 21V28H72V12Z" fill="currentColor"/>
              <path d="M103 20C103 15 107 12 112 12C117 12 120 15 120 20C120 25 117 28 112 28C107 28 103 25 103 20ZM115 20C115 18 114 16 112 16C110 16 108 18 108 20C108 22 110 24 112 24C114 24 115 22 115 20Z" fill="currentColor"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-neutral-text">Welcome to Civcon Office</h2>
          <p className="text-neutral-textLight mt-2">Procurement management system</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Sign in to access the procurement management system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-neutral-secondary/30 p-4 rounded-md text-sm">
              <p>This application allows you to:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Manage construction projects</li>
                <li>Track suppliers and procurement</li>
                <li>Create purchase requisitions</li>
                <li>Process purchase orders</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <a 
              href="/api/login" 
              className="w-full"
            >
              <Button className="w-full">
                Sign in with Replit
              </Button>
            </a>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center text-sm text-neutral-textLight">
          <p>
            &copy; {new Date().getFullYear()} Civcon Office. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
