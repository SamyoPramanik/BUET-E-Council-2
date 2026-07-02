"use client";

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card shadow-lg border border-border max-w-md w-full p-8 rounded-lg">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary tracking-wide mb-2">BUET E-COUNCIL</h1>
          <p className="text-muted-foreground text-sm">Sign in to your account</p>
        </div>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Username or Email</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              placeholder="Enter your username"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground pr-10"
                placeholder="••••••••"
              />
              <button 
                type="button"
                className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-primary text-primary-foreground font-medium py-2 px-4 rounded-md hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            Sign In
          </button>
        </form>
        
      </div>
    </div>
  );
}
