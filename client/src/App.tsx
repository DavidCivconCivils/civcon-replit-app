import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import Suppliers from "@/pages/suppliers";
import Requisitions from "@/pages/requisitions";
import Orders from "@/pages/orders";
import Reports from "@/pages/reports";
import Login from "@/pages/login";
import MainLayout from "./components/layout/MainLayout";
import { useAuth } from "./hooks/useAuth";

function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any>, [key: string]: any }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/">
        <MainLayout>
          <ProtectedRoute component={Dashboard} />
        </MainLayout>
      </Route>
      
      <Route path="/projects">
        <MainLayout>
          <ProtectedRoute component={Projects} />
        </MainLayout>
      </Route>
      
      <Route path="/suppliers">
        <MainLayout>
          <ProtectedRoute component={Suppliers} />
        </MainLayout>
      </Route>
      
      <Route path="/requisitions">
        <MainLayout>
          <ProtectedRoute component={Requisitions} />
        </MainLayout>
      </Route>
      
      <Route path="/orders">
        <MainLayout>
          <ProtectedRoute component={Orders} />
        </MainLayout>
      </Route>
      
      <Route path="/reports">
        <MainLayout>
          <ProtectedRoute component={Reports} />
        </MainLayout>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
