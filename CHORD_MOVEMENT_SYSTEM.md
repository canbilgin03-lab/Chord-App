# Fretboard Note Movement System

## Overview
This document describes the enhanced chord naming and validation system that enables intuitive note movement on the fretboard with real-time visual feedback.

## How It Works

### 1. Comprehensive Chord Recognition (`inferChordSymbol`)
The system now recognizes a complete set of chord types:

#### Basic Triads
- **Major**: C, D, E (root, major 3rd, perfect 5th)
- **Minor**: C, Eb, G (root, minor 3rd, perfect 5th)

#### Seventh Chords
- **Dominant 7**: C7 (root, major 3rd, perfect 5th, minor 7th)
- **Major 7**: Cmaj7 (root, major 3rd, perfect 5th, major 7th)
- **Minor 7**: Cm7 (root, minor 3rd, perfect 5th, minor 7th)
- **Half-Diminished (m7b5)**: Cm7b5 (root, minor 3rd, diminished 5th, minor 7th)

#### Extended Chords
- **6 Chords**: C6, Cm6 (adds major 6th)
- **Add 9 Chords**: Cadd9, Cmadd9 (adds major 9th without 7th)
- **9 Chords**: C9, Cm9 (extends 7th chords with 9th)
- **maj9**: Cmaj9 (major 7th chord with 9th)

#### Suspended & Special Chords
- **Sus2/Sus4**: Csus2, Csus4 (replaces 3rd with 2nd or 4th)
- **7sus2/7sus4**: C7sus2, C7sus4 (7th chord with suspended notes)
- **Augmented**: Caug (raised 5th)
- **Diminished**: Cdim, Cdim7 (lowered 3rd and 5th)

#### Edge Cases Handled
- **Two-note chords**: [C, E] → C, [C, Bb] → C7, [C, B] → Cmaj7
- **Single notes**: [C] → C
- **Octave doublings**: [C, E, G, C] → C (extra C is ignored)
- **Power chords**: [C, G] → C

### 2. Chord Validation (`canNameChord`)
A new exported function that validates whether a set of notes can form a namable chord:

```typescript
// Returns true - valid chord
canNameChord(['C', 'E', 'G']) // true
canNameChord(['C', 'Eb', 'G', 'Bb']) // true

// Returns false - cannot be named
canNameChord(['C', 'D', 'E#', 'Gb']) // false (if truly unnamable)
```

### 3. Visual Feedback System
During drag operations on the fretboard:

**Green Indicator** (emerald-500/20 with ring-2 ring-emerald-400/60)
- Shows fret positions where the note CAN be moved
- Results in a valid, namable chord
- User can safely drop the note here

**Red Indicator** (red-500/15 with ring-2 ring-red-400/60)
- Shows fret positions where the note CANNOT be moved
- Would result in an unnamable chord
- Drop will be rejected

## Implementation Details

### Changes to `chordEngine.ts`

1. **Enhanced `inferChordSymbol` function**
   - Added comprehensive pattern matching for all chord types
   - Better handling of incomplete chords (2-note, 1-note)
   - Prioritizes specific chords before generic ones
   - Falls back gracefully for edge cases

2. **New `canNameChord` export**
   ```typescript
   export function canNameChord(notes: string[], key = "C", mode = "Ionian"): boolean {
     return inferChordSymbol(notes, key, mode) !== null
   }
   ```

### Changes to `page.tsx`

1. **Imported `canNameChord`** function for use in validation

2. **Enhanced preview functions**
   - `getFretPreviewState()` - Validates single fret positions
   - `getFretPreviewStateForString()` - Validates string muting
   - `getAllFretPreviewStates()` - Pre-computes all valid/invalid positions (for future optimization)

3. **Existing UI already displays the results**
   - The overlay system was already in place at line 1760
   - Shows green/red indicators based on `getFretPreviewState()` result
   - Updates in real-time as user drags notes

## Workflow for Users

1. **Click a note to select it for moving**
   - The note becomes highlighted/active

2. **Drag to a new fret position**
   - Green indicators appear on valid fret positions
   - Red indicators appear on invalid fret positions
   - The indicators update live as you hover

3. **Drop on a green fret**
   - Chord is accepted and chord name updates
   - The custom voicing is saved

4. **Drop on a red fret (or try to drop)**
   - Chord is rejected
   - Voicing remains unchanged
   - User gets immediate feedback why the move isn't allowed

## Testing

All 21 tests pass, covering:
- ✅ Major and minor triads
- ✅ Seventh chords (dom7, maj7, m7, m7b5)
- ✅ Extended chords (6, add9, 6add9, maj9, m9, 9)
- ✅ Suspended chords (sus2, sus4, 7sus2, 7sus4)
- ✅ Diminished and augmented chords
- ✅ Two-note chords and single notes
- ✅ Octave doublings and power chords

## Performance Considerations

### Current Approach (Efficient)
- `getFretPreviewState()` is called only for visible frets during rendering
- Each fret position validates instantly
- No pre-computation overhead

### Future Optimization (if needed)
- `getAllFretPreviewStates()` pre-computes all valid positions
- Can be used to build a complete map before rendering
- Useful if rendering performance becomes an issue with many strings/frets

## Known Limitations

1. **Enharmonic spellings**: Notes like 'Bbb' may behave unexpectedly
   - Recommendation: Use standard spellings (C, C#, Db, etc.)

2. **Inversions**: The system treats all voicings equally
   - Bass notes are handled separately via the chord analysis system
   - Note position on the fretboard doesn't affect chord identification

3. **Ambiguous combinations**: Some rare note combinations might not be recognized
   - This is intentional - prevents false positives
   - Users won't be able to move notes to create impossible chords

## Future Enhancements

1. **Bass note enforcement**
   - Could require bass note (lowest note) to be from the chord
   - Or allow any bass note for slash chords

2. **Scale context awareness**
   - Could validate moves based on the current key/scale
   - Warn about out-of-key movements

3. **Fingering difficulty**
   - Could show difficulty indicators along with validity
   - Some valid positions might be unplayable

4. **Chord history**
   - Track valid voicings user has played
   - Suggest common variations

## Troubleshooting

**Q: Why does a fret show red when I think it should be valid?**
A: The note combination doesn't form any recognized chord type. Try moving to a different position, or adjust multiple notes together.

**Q: Why can't I move a note to certain frets?**
A: Those frets would create note combinations that don't form namable chords. The red indicator is helping you avoid invalid states.

**Q: A chord I know isn't being recognized**
A: Check the chord naming section above. If it's a valid type, it should be recognized. If not, it might be an edge case - file an issue with the specific notes.
