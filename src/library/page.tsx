import TrackCard from "../components/TrackCard";

// Sample library tracks
const libraryTracks = [
  {
    id: "lib-1",
    title: "My Favorite Beat",
    artist: "Personal Collection",
    album: "Saved Tracks",
    cover: "https://picsum.photos/200/200?random=5",
    src: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
    duration: 220,
  },
  {
    id: "lib-2",
    title: "Study Focus Mix",
    artist: "Concentration Sounds",
    album: "Work Playlist",
    cover: "https://picsum.photos/200/200?random=6",
    src: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
    duration: 300,
  },
];

export default function LibraryPage() {
  return (
    <div className="min-h-screen px-8 py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-accent mb-6">
            Your Library
          </h1>
          <p className="text-text-light/80 max-w-md mx-auto">
            Access your saved audio content, playlists, and favorite creators
            all in one place.
          </p>
        </div>

        {/* Recently Played */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-text-light mb-6">
            Recently Played
          </h2>
          <div className="space-y-2">
            {libraryTracks.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        </section>

        {/* Your Playlists */}
        <section>
          <h2 className="text-2xl font-bold text-text-light mb-6">
            Your Playlists
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-surface/50 rounded-lg p-6 border-2 border-dashed border-accent/30 hover:border-accent/50 transition cursor-pointer">
              <div className="text-center">
                <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-6 h-6 text-accent text-xl">+</div>
                </div>
                <h3 className="font-medium text-text-light mb-2">
                  Create Playlist
                </h3>
                <p className="text-sm text-text-light/70">
                  Add your favorite tracks
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
