import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { config } from "dotenv";

// Validate environment at build time (disabled for frontend-only deployment)
function validateEnvironmentPlugin() {
  return {
    name: 'validate-environment',
    buildStart() {
      // Skip validation for test deployment - frontend only
      if (process.env.NODE_ENV === 'production' && !process.env.VITE_SUPABASE_URL) {
        console.log('⚠️  Frontend-only deployment - Supabase validation skipped');
        return;
      }

      try {
        // Load environment variables from .env file
        config();

        // Check required environment variables (only if Supabase is used)
        if (process.env.VITE_SUPABASE_URL) {
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
      } catch (error) {
        this.error(`Environment validation failed: ${error.message}`);
      }
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    validateEnvironmentPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../../src"),
    },
  },
}));
