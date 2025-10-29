import { useState } from "react";
import { GENRES, GENRE_EMOJIS } from "../lib/genres";

interface GenreSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (genre: string) => void;
  bookTitle: string;
}

export default function GenreSelectionDialog({
  isOpen,
  onClose,
  onConfirm,
  bookTitle,
}: GenreSelectionDialogProps) {
  const [selectedGenre, setSelectedGenre] = useState<string>("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedGenre) {
      alert("Please select a genre");
      return;
    }
    onConfirm(selectedGenre);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold text-text-light mb-4">
          Publish "{bookTitle}"
        </h2>

        <p className="text-text-muted mb-4">
          Select a genre to help readers discover your audiobook:
        </p>

        <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
          {GENRES.map((genre) => (
            <label
              key={genre}
              className="flex items-center space-x-3 cursor-pointer hover:bg-background rounded-lg p-2 transition-colors"
            >
              <input
                type="radio"
                name="genre"
                value={genre}
                checked={selectedGenre === genre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-4 h-4 text-accent bg-background border-border focus:ring-accent focus:ring-2"
              />
              <span className="text-2xl mr-2">{GENRE_EMOJIS[genre]}</span>
              <span className="text-text-light">{genre}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-muted hover:text-text-light transition-colors border border-transparent hover:border-highlight/50 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedGenre}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-transparent hover:border-highlight enabled:hover:border-highlight"
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}
