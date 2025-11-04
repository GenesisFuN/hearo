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
                const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (darkMode) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
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
