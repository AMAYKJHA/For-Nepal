import { Press_Start_2P, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import "./globals.css";

// Thematic pixel display font (headers, RPG alerts).
const pressStart = Press_Start_2P({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

// Functional reading font (questions, lore, body copy).
const hanken = Hanken_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

// Data / stats mono font (XP, damage, timers).
const jetBrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Scholar - Learn , Play, Conquer Knowledge",
  description: "Learn by battling. Chat. Play. Conquer knowledge.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${pressStart.variable} ${hanken.variable} ${jetBrains.variable}`}
    >
      <head>
        {/* Preconnect links help the browser load the icons faster */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Your Material Symbols Link */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
