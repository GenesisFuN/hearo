interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  key: string;
  description: string;
}

const shortcuts: Shortcut[] = [
  { key: "Space", description: "Play / Pause" },
  { key: "←", description: "Seek backward 15 seconds" },
  { key: "→", description: "Seek forward 15 seconds" },
  { key: "↑", description: "Increase volume" },
  { key: "↓", description: "Decrease volume" },
  { key: "M", description: "Toggle mute" },
  { key: "F", description: "Toggle fullscreen player" },
  { key: "?", description: "Show keyboard shortcuts" },
];

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-lg max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-text-light">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-light transition flex items-center justify-center text-text-light/70"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b border-surface-light last:border-0"
            >
              <span className="text-text-light/70">{shortcut.description}</span>
              <kbd className="bg-background px-3 py-1.5 rounded text-sm font-mono text-accent border border-accent/30">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-text-light/50">
            Press{" "}
            <kbd className="bg-background px-2 py-0.5 rounded text-xs font-mono text-accent">
              ?
            </kbd>{" "}
            to toggle this dialog
          </p>
        </div>
      </div>
    </div>
  );
}
