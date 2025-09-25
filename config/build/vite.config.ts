import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { config } from "dotenv";

// Validate environment at build time
function validateEnvironmentPlugin() {
  return {
    name: 'validate-environment',
    buildStart() {
      try {
        // Load environment variables from .env file
        config();

        // Check required environment variables
        const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);

        if (missingVars.length > 0) {
          throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

        // Basic URL validation
        if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.startsWith('https://')) {
          throw new Error('SUPABASE_URL must be a valid HTTPS URL');
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
