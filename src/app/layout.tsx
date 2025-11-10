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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* CRITICAL: Hide content until theme is applied to prevent flash */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
            html { visibility: hidden; opacity: 0; }
            html.theme-ready { visibility: visible; opacity: 1; }
          `,
          }}
        />

        {/* Apply theme IMMEDIATELY before any content renders */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('hearo-theme') || 'light';
                  const root = document.documentElement;
                  
                  if (theme === 'dark') {
                    root.classList.add('dark');
                  }
                  
                  root.classList.add('theme-ready');
                } catch (e) {
                  document.documentElement.classList.add('theme-ready');
                }
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
