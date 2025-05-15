import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            The page you're looking for doesn't exist. You may have mistyped the address
            or the page may have moved.
          </p>
          
          <div className="mt-6 flex gap-4">
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2">
                <Home size={16} />
                Home
              </Button>
            </Link>
            
            <Link href="/login">
              <Button className="flex items-center gap-2">
                <LogIn size={16} />
                Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
