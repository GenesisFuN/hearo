import TrackCard from "../components/TrackCard";

// Sample track data
const sampleTracks = [
  {
    id: "1",
    title: "Neon Dreams",
    artist: "Synthwave Collective",
    album: "Digital Nights",
    cover: "https://picsum.photos/200/200?random=1",
    src: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", // Demo audio
    duration: 240,
  },
  {
    id: "2",
    title: "Cosmic Journey",
    artist: "Space Ambient",
    album: "Stellar Sounds",
    cover: "https://picsum.photos/200/200?random=2",
    src: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", // Demo audio
    duration: 180,
  },
  {
    id: "3",
    title: "Future Bass Drop",
    artist: "ElectroVibes",
    album: "Bass Revolution",
    cover: "https://picsum.photos/200/200?random=3",
    src: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", // Demo audio
    duration: 195,
  },
  {
    id: "4",
    title: "Midnight Chill",
    artist: "LoFi Beats",
    album: "Study Sessions",
    cover: "https://picsum.photos/200/200?random=4",
    src: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", // Demo audio
    duration: 205,
  },
];

export default function DiscoverPage() {
  return (
    <div className="min-h-screen px-8 py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-accent mb-6">
            Discover
          </h1>
          <p className="text-text-light/80 max-w-md mx-auto">
            Explore new audio experiences and discover amazing creators from
            around the world.
          </p>
        </div>

        {/* Featured Tracks */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-text-light mb-6">
            Featured Tracks
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sampleTracks.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        </section>

        {/* Trending Now */}
        <section>
          <h2 className="text-2xl font-bold text-text-light mb-6">
            Trending Now
          </h2>
          <div className="space-y-2">
            {sampleTracks.slice(0, 3).map((track) => (
              <TrackCard
                key={`trending-${track.id}`}
                track={{ ...track, id: `trending-${track.id}` }}
                className="hover:bg-surface/60"
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
