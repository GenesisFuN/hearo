import { useState, useEffect } from "react";
import { getProgress } from "../lib/progress";

export function useBookProgress(bookId: string) {
  const [hasProgress, setHasProgress] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProgress = async () => {
      try {
        const progress = await getProgress(bookId);
        setHasProgress(progress !== null && progress.progressSeconds > 30);
      } catch (error) {
        console.error("Error checking progress:", error);
        setHasProgress(false);
      } finally {
        setLoading(false);
      }
    };

    checkProgress();
  }, [bookId]);

  return { hasProgress, loading };
}
