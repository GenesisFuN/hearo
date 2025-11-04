import "../styles/globals.css";
import Navbar from "../components/Navbar";
import AudioPlayer from "../components/AudioPlayer";
import Footer from "../components/Footer";
import { PlayerProvider } from "../contexts/PlayerContext";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { ToastProvider } from "../components/Toast";
import { ErrorBoundary } from "../components/ErrorBoundary";
import EmailVerificationBanner from "../components/EmailVerificationBanner";

export const metadata = {
  title: "Hearo",
  description: "Futuristic audio experiences for creators and listeners",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('hearo-theme');
                  const root = document.documentElement;
                  
                  if (savedTheme === 'dark') {
                    root.classList.add('dark');
                    root.style.setProperty('--color-background', 'hsl(30, 15%, 12%)');
                    root.style.setProperty('--color-surface', 'hsl(30, 12%, 18%)');
                    root.style.setProperty('--color-surface-light', 'hsl(30, 10%, 24%)');
                    root.style.setProperty('--color-accent', 'hsl(40, 55%, 70%)');
                    root.style.setProperty('--color-text', 'hsl(35, 25%, 88%)');
                    root.style.setProperty('--color-text-light', 'hsl(35, 25%, 88%)');
                    root.style.setProperty('--color-highlight', 'hsl(270, 70%, 65%)');
                  } else {
                    root.classList.remove('dark');
                    root.style.setProperty('--color-background', 'hsl(35, 35%, 92%)');
                    root.style.setProperty('--color-surface', 'hsl(35, 30%, 85%)');
                    root.style.setProperty('--color-surface-light', 'hsl(35, 25%, 78%)');
                    root.style.setProperty('--color-accent', 'hsl(25, 50%, 45%)');
                    root.style.setProperty('--color-text', 'hsl(30, 25%, 20%)');
                    root.style.setProperty('--color-text-light', 'hsl(30, 25%, 20%)');
                    root.style.setProperty('--color-highlight', 'hsl(345, 65%, 75%)');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-background text-text-light font-sans min-h-screen flex flex-col">
        <ErrorBoundary>
          <ToastProvider>
            <ThemeProvider>
              <AuthProvider>
                <PlayerProvider>
                  {/* Navigation */}
                  <Navbar />

                  {/* Email Verification Banner */}
                  <EmailVerificationBanner />

                  {/* Main content */}
                  <main className="flex-1">{children}</main>

                  {/* Audio Player */}
                  <AudioPlayer />

                  {/* Footer */}
                  <Footer />
                </PlayerProvider>
              </AuthProvider>
            </ThemeProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
