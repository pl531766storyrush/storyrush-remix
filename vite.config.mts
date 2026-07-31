import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react({
        include: /\.(js|jsx|ts|tsx)$/,
      }),
      tailwindcss()
    ],
    resolve: {
      extensions: [
        '.web.tsx',
        '.web.ts',
        '.web.jsx',
        '.web.js',
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '.css',
        '.json',
      ],
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react-native-web/Libraries/Utilities/codegenNativeComponent': path.resolve(__dirname, 'mockCodegen.ts'),
        'react-native/Libraries/Utilities/codegenNativeComponent': path.resolve(__dirname, 'mockCodegen.ts'),
        'react-native': path.resolve(__dirname, 'react-native-web-wrapper.ts'),
        'expo-video': path.resolve(__dirname, 'expo-video-web.tsx'),
        'lucide-react-native': 'lucide-react',
      },
    },
    define: {
      __DEV__: 'false',
      global: 'globalThis',
    },
    optimizeDeps: {
      exclude: ['expo-video', 'expo-modules-core'],
      esbuildOptions: {
        loader: {
          '.js': 'jsx' as const,
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
