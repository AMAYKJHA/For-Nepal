import ThemeProvider from '@/components/ThemeProvider';
import AuthProvider from '@/components/AuthProvider';
import './globals.css';

export const metadata = {
  title: 'Scholar - Level Up Your Mind',
  description: 'Turn your notes into victory',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body>
          <AuthProvider>
            {children}
          </AuthProvider>
      </body>
    </html>
  );
}