import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function Login() {
  const { user, isLoading, isAuthenticated, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resetPasswordStatus, setResetPasswordStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Registration form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  // Initialize password reset form
  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Handle form submission
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
  };
  
  const { toast } = useToast();
  
  const handleResetPassword = async (data: ResetPasswordFormValues) => {
    try {
      setResetPasswordStatus("pending");
      const response = await apiRequest("POST", "/api/reset-password", {
        email: data.email,
        newPassword: data.newPassword,
      });
      
      if (response.ok) {
        setResetPasswordStatus("success");
        resetPasswordForm.reset();
        toast({
          title: "Password reset successful",
          description: "Your password has been changed. You can now log in with your new password.",
        });
        setTimeout(() => {
          setResetPasswordModalOpen(false);
          setResetPasswordStatus("idle");
        }, 2000);
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to reset password");
      }
    } catch (error: any) {
      setResetPasswordStatus("error");
      toast({
        title: "Password reset failed",
        description: error.message || "An error occurred while resetting your password",
        variant: "destructive",
      });
      console.error("Password reset error:", error);
    }
  };

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
            <CardTitle>Account Access</CardTitle>
            <CardDescription>
              Sign in or register to access the procurement management system
            </CardDescription>
          </CardHeader>
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            {/* Login Form */}
            <TabsContent value="login">
              <CardContent className="pt-4">
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="your.email@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register">
              <CardContent className="pt-4">
                <Form {...registerForm}>
                  <form
                    onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="your.email@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </TabsContent>
          </Tabs>
          <CardFooter className="flex flex-col space-y-4">
            <div className="bg-neutral-secondary/30 p-4 rounded-md text-sm w-full">
              <p>This application allows you to:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Manage construction projects</li>
                <li>Track suppliers and procurement</li>
                <li>Create purchase requisitions</li>
                <li>Process purchase orders</li>
              </ul>
            </div>
            <div className="text-center text-sm text-neutral-textLight w-full">
              {activeTab === "login" ? (
                <div className="space-y-2">
                  <div>
                    Don't have an account?{" "}
                    <button
                      className="text-primary hover:underline"
                      onClick={() => setActiveTab("register")}
                      type="button"
                    >
                      Register
                    </button>
                  </div>
                  <div>
                    Forgot your password?{" "}
                    <button
                      className="text-primary hover:underline"
                      onClick={() => setResetPasswordModalOpen(true)}
                      type="button"
                    >
                      Reset password
                    </button>
                  </div>
                </div>
              ) : (
                <span>
                  Already have an account?{" "}
                  <button
                    className="text-primary hover:underline"
                    onClick={() => setActiveTab("login")}
                    type="button"
                  >
                    Login
                  </button>
                </span>
              )}
            </div>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center text-sm text-neutral-textLight">
          <p>
            &copy; {new Date().getFullYear()} Civcon Office. All rights reserved.
          </p>
        </div>
      </div>

      {/* Reset Password Modal */}
      <Dialog open={resetPasswordModalOpen} onOpenChange={setResetPasswordModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email and new password to reset your account password.
            </DialogDescription>
          </DialogHeader>
          
          {resetPasswordStatus === "success" ? (
            <div className="py-4">
              <Alert className="bg-green-50 border-green-500">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-700">Success!</AlertTitle>
                <AlertDescription className="text-green-700">
                  Your password has been reset successfully. You can now log in with your new password.
                </AlertDescription>
              </Alert>
            </div>
          ) : resetPasswordStatus === "error" ? (
            <div className="py-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to reset password. Please check your email and try again.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <Form {...resetPasswordForm}>
              <form 
                onSubmit={resetPasswordForm.handleSubmit(handleResetPassword)}
                className="space-y-4 py-4"
              >
                <FormField
                  control={resetPasswordForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="your.email@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetPasswordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetPasswordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button
                    type="submit"
                    disabled={resetPasswordStatus === "pending"}
                    className="w-full"
                  >
                    {resetPasswordStatus === "pending" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
