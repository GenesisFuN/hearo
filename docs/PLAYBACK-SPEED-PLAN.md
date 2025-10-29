# Playback Speed Control - Implementation Plan

## Overview

Add variable playback speed control (0.5x - 2.0x) to the audio player with UI controls in both the mini player bar and fullscreen view. Speed preference will be remembered per user.

## Target Date

October 21, 2025

## Feature Requirements

### 1. Speed Options

- **Range:** 0.5x to 2.0x
- **Presets:**
  - 0.5x (Half speed)
  - 0.75x (Slower)
  - 1.0x (Normal) - Default
  - 1.25x (Faster)
  - 1.5x (Fast)
  - 1.75x (Very Fast)
  - 2.0x (Maximum)

### 2. UI Components

#### Mini Player Bar

- Speed button showing current speed (e.g., "1x", "1.5x")
- Click to open speed selector dropdown/menu
- Visual indicator of active speed
- Positioned between volume and fullscreen controls

#### Fullscreen Player

- Dedicated speed control section
- Larger, more prominent display
- Same speed options as mini player
- Visual feedback when speed changes

### 3. Persistence

- Save speed preference to localStorage (for anonymous users)
- Save to user preferences in database (for authenticated users)
- Remember speed preference globally (applies to all books)
- OR remember per-book (user choice?)

### 4. Technical Implementation

#### AudioPlayer Component Updates

```typescript
// New state
const [playbackRate, setPlaybackRate] = useState(1.0);

// Apply speed to audio element
audio.playbackRate = playbackRate;

// Save preference
localStorage.setItem("playbackSpeed", playbackRate.toString());
```

#### Speed Selector Component

```typescript
interface SpeedOption {
  value: number;
  label: string;
}

const speeds: SpeedOption[] = [
  { value: 0.5, label: "0.5x" },
  { value: 0.75, label: "0.75x" },
  { value: 1.0, label: "Normal" },
  { value: 1.25, label: "1.25x" },
  { value: 1.5, label: "1.5x" },
  { value: 1.75, label: "1.75x" },
  { value: 2.0, label: "2x" },
];
```

## Implementation Steps

### Step 1: Add State & Logic to AudioPlayer

- [ ] Add `playbackRate` state
- [ ] Load saved speed preference on mount
- [ ] Apply `playbackRate` to audio element
- [ ] Create `setSpeed()` function to update speed
- [ ] Save speed preference when changed

### Step 2: Create SpeedSelector Component

- [ ] Create `src/components/SpeedSelector.tsx`
- [ ] Build dropdown UI with speed options
- [ ] Add click handlers
- [ ] Style with current theme (accent colors)
- [ ] Add smooth transitions

### Step 3: Add to Mini Player Bar

- [ ] Add speed button to control bar
- [ ] Position between volume and fullscreen
- [ ] Show current speed (e.g., "1.5x")
- [ ] Wire up SpeedSelector dropdown
- [ ] Test responsive layout

### Step 4: Add to Fullscreen Player

- [ ] Add speed control section
- [ ] Larger, more prominent display
- [ ] Same SpeedSelector component (reusable)
- [ ] Style for fullscreen context
- [ ] Test visual hierarchy

### Step 5: Polish & Testing

- [ ] Add keyboard shortcuts (optional: [ and ] keys)
- [ ] Smooth transitions when changing speed
- [ ] Visual feedback (highlight active speed)
- [ ] Test across different browsers
- [ ] Test speed persistence
- [ ] Verify audio quality at different speeds

## UI Design Mockup

### Mini Player Bar

```
[← Previous] [⏸ Play] [Next →]  [Progress Bar]  [🔊 Volume] [1.5x ▼] [⛶ Fullscreen]
                                                              ↑
                                                        Speed Control
```

### Fullscreen Player

```
┌─────────────────────────────────────┐
│         Album Art / Cover           │
│                                     │
│         Book Title                  │
│         by Author                   │
│                                     │
│    [Progress Bar with Time]         │
│                                     │
│    [⏮ ⏸ ⏭]   Speed: [1.5x ▼]      │
│                                     │
│    Volume: [====|----]              │
└─────────────────────────────────────┘
```

## User Experience Flow

1. **First Time User**
   - Speed defaults to 1.0x (Normal)
   - Clicks speed button → dropdown appears
   - Selects 1.5x → speed changes immediately
   - Preference saved automatically

2. **Returning User**
   - Previous speed preference (1.5x) loads automatically
   - Applies to all books
   - Can change anytime via speed control

3. **Speed Change**
   - Click speed button
   - Select new speed from dropdown
   - Audio immediately adjusts
   - Button updates to show new speed
   - Preference saved

## Technical Considerations

### Browser Compatibility

- HTML5 Audio `playbackRate` property (supported in all modern browsers)
- Range: typically 0.25x to 4.0x (we'll limit to 0.5x - 2.0x for quality)

### Audio Quality

- Most browsers handle 0.5x - 2.0x well without pitch distortion
- Modern browsers use time-stretching (maintains pitch)
- No additional processing needed

### Performance

- Minimal impact - native browser feature
- No re-encoding or buffering required
- Instantaneous speed changes

## Edge Cases to Handle

1. **Speed persists across books**
   - If user sets 1.5x, all books play at 1.5x
   - Clear indication of current speed
2. **Speed resets to 1.0x option** (for future)
   - Add "Reset to Normal" button?
   - Or always show 1.0x in options

3. **Extreme speeds**
   - Limit to 0.5x - 2.0x for best quality
   - Disable options outside this range

4. **Mobile considerations**
   - Ensure touch targets are large enough
   - Dropdown should work well on mobile
   - Consider bottom sheet on mobile?

## Success Metrics

- ✅ Speed control accessible in both mini and fullscreen players
- ✅ Speed changes applied instantly
- ✅ Preference persisted across sessions
- ✅ Visual feedback clear and intuitive
- ✅ No audio quality degradation
- ✅ Works on mobile and desktop

## Future Enhancements

1. **Per-book speed memory** - Remember different speeds for different books
2. **Speed presets** - User-defined favorite speeds
3. **Keyboard shortcuts** - [ and ] to adjust speed
4. **Speed in URL** - Share links with specific speed
5. **Speed recommendations** - Suggest optimal speed based on content type
6. **Fine-tune control** - Slider for precise speed adjustment (e.g., 1.37x)

## Files to Create/Modify

### New Files:

- `src/components/SpeedSelector.tsx` - Speed selection dropdown component

### Modified Files:

- `src/components/AudioPlayer.tsx` - Add playback speed state and controls
  - Mini player bar: Add speed button
  - Fullscreen view: Add speed control section
  - Audio element: Apply playbackRate
  - Persistence: Save/load speed preference

### Documentation:

- `docs/PLAYBACK-SPEED-COMPLETE.md` - Implementation summary

## Estimated Time

- **State & Logic:** 30 minutes
- **SpeedSelector Component:** 45 minutes
- **Mini Player Integration:** 30 minutes
- **Fullscreen Integration:** 30 minutes
- **Testing & Polish:** 30 minutes
- **Total:** ~2.5 hours

---

## Notes

- Keep UI minimal and intuitive
- Match existing player design language
- Use accent color for active speed
- Smooth transitions for professional feel
- Mobile-first design approach

**Status:** 📋 Ready for Implementation
**Priority:** High - Common audiobook feature
**Complexity:** Low-Medium - Native browser support
