import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { config } from "dotenv";

// Environment validation plugin for security
function validateEnvironmentPlugin() {
  return {
    name: 'validate-environment',
    buildStart() {
      // Load environment variables from .env file
      config();

      // Check required environment variables for production builds
      if (process.env.NODE_ENV === 'production') {
        const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);

        if (missingVars.length > 0) {
          throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

        // Basic URL validation
        if (process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_URL.startsWith('https://')) {
          throw new Error('VITE_SUPABASE_URL must be a valid HTTPS URL');
        }
      }

      console.log('✅ Environment validation passed');
    }
  };
}

// Simple Vite config for Vercel deployment with security validation
export default defineConfig({
  plugins: [react(), validateEnvironmentPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
  },
});