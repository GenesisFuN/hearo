export default function Footer() {
  return (
    <footer className="w-full bg-surface text-text-light/70 text-center py-6 border-t border-surface/40 mt-auto">
      <p className="text-sm">
        © {new Date().getFullYear()} Hearo — Built for creators and listeners
        alike.
      </p>
    </footer>
  );
}
