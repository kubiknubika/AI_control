"""Generate the menu score and the fifth button sound.

The score is deliberately built from a small musical specification instead of
random oscillator patterns:

- D Dorian: a minor centre with a raised sixth for mystery plus lift.
- 6/8 at 72 BPM: a slow travelling pulse rather than a dance beat.
- D-F-G-B: a four-note motif; B is the Dorian colour note.
- 72 bars: introduction, statement, development, rise, and return.
- The rendered file is cut-and-crossfaded so the browser loop has no hard seam.

This is a lightweight offline renderer for the prototype. It uses additive
synthesis so the generated asset can be regenerated without third-party tools.
"""

from array import array
import math
import os
import random
import struct
import wave

OUTPUT_DIR = "public/audio"
SAMPLE_RATE = 22050
BPM = 72
EIGHTH = 60.0 / BPM / 2.0
BAR = EIGHTH * 6.0
BAR_SAMPLES = int(round(BAR * SAMPLE_RATE))

# MIDI note numbers make the score readable while keeping the renderer small.
def hz(note: int) -> float:
    return 440.0 * (2.0 ** ((note - 69) / 12.0))


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def harmonic_wave(frequency: float, time: float, vibrato: float = 0.0) -> float:
    phase = 2.0 * math.pi * frequency * time
    phase += vibrato * math.sin(2.0 * math.pi * 5.1 * time)
    return (
        math.sin(phase)
        + 0.28 * math.sin(phase * 2.0 + 0.13)
        + 0.11 * math.sin(phase * 3.0 + 0.27)
        + 0.045 * math.sin(phase * 4.0 + 0.41)
    ) / 1.435


def pad_voice(frequency: float, time: float) -> float:
    """A warm bowed-like voice with restrained upper harmonics."""
    vibrato = 0.012 * frequency
    return harmonic_wave(frequency, time, vibrato)


def pluck_voice(frequency: float, age: float) -> float:
    """A rounded harp/lute-like one-shot, without a bell attack."""
    if age < 0.0 or age > 1.15:
        return 0.0
    attack = min(1.0, age / 0.018)
    decay = math.exp(-age * 4.8)
    phase = 2.0 * math.pi * frequency * age
    return attack * decay * (
        0.76 * math.sin(phase)
        + 0.20 * math.sin(phase * 2.0)
        + 0.06 * math.sin(phase * 3.0)
    )


def lead_voice(frequency: float, age: float, duration: float) -> float:
    """A soft sustained lead used only during the development and rise."""
    if age < 0.0 or age > duration:
        return 0.0
    attack = smoothstep(age / 0.18)
    release = smoothstep((duration - age) / 0.28)
    envelope = attack * release
    return envelope * harmonic_wave(frequency, age, 0.008 * frequency)


def low_pulse(frequency: float, age: float) -> float:
    """A quiet low-string/timpani-like pulse for the two 6/8 beats."""
    if age < 0.0 or age > 1.55:
        return 0.0
    attack = min(1.0, age / 0.025)
    envelope = attack * math.exp(-age * 2.7)
    phase = 2.0 * math.pi * frequency * age
    return envelope * (
        0.72 * math.sin(phase)
        + 0.19 * math.sin(phase * 2.0)
        + 0.09 * math.sin(phase * 3.0)
    )


# Chords are voiced in a Dorian palette. Dm and G are the central i-IV colour;
# C, Am, F, and Em provide motion without turning the cue into a sad minor loop.
CHORDS = {
    "dm": (50, 57, 60, 64),  # Dm(add9)
    "g": (43, 50, 55, 59, 62),
    "c": (48, 55, 60, 64, 67),
    "am": (45, 52, 57, 60, 64),
    "f": (41, 48, 53, 57, 60),
    "em": (40, 47, 52, 55, 59),
}

INTRO = ["dm", "dm", "g", "dm", "c", "g", "dm", "dm"]
A_SECTION = [
    "dm", "g", "c", "g", "dm", "g", "am", "g",
    "dm", "g", "c", "f", "g", "dm", "g", "dm",
]
A_DEVELOPMENT = [
    "dm", "g", "c", "g", "dm", "am", "f", "g",
    "dm", "g", "c", "g", "am", "f", "g", "dm",
]
EPIC_RISE = [
    "g", "c", "am", "f", "g", "dm", "c", "g",
    "g", "c", "am", "f", "g", "dm", "c", "g",
]
RETURN = ["dm", "g", "c", "g", "dm", "g", "dm", "dm"]
BARS = INTRO + A_SECTION + A_DEVELOPMENT + EPIC_RISE + RETURN + INTRO
DURATION = len(BARS) * BAR

# Four-note identity motif: D-F-G-B. The natural B is the Dorian lift.
MOTIF = (62, 65, 67, 71)
ANSWER = (69, 67, 65, 62)
MOTIF_POSITIONS = (0, 1, 2, 4)


def interpolated_chord(current, following, amount):
    return tuple(a + (b - a) * amount for a, b in zip(current, following))


def section_energy(bar_index: int) -> float:
    if bar_index < 8:
        return 0.38
    if bar_index < 24:
        return 0.78
    if bar_index < 40:
        return 0.92
    if bar_index < 56:
        return 1.08
    if bar_index < 64:
        return 0.70
    return 0.38


def render_score():
    total_samples = int(round(DURATION * SAMPLE_RATE))
    left = array("f", [0.0]) * total_samples
    right = array("f", [0.0]) * total_samples
    noise = 0.0
    rng = random.Random(2048)

    for sample_index in range(total_samples):
        time = sample_index / SAMPLE_RATE
        bar_position = time / BAR
        bar_index = min(len(BARS) - 1, int(bar_position))
        local_bar = bar_position - bar_index
        chord_name = BARS[bar_index]
        next_chord_name = BARS[(bar_index + 1) % len(BARS)]
        current = CHORDS[chord_name]
        following = CHORDS[next_chord_name]

        # Smooth the chord change in its final 18% instead of hard-switching
        # every bar. The very slow arc returns to its starting intensity at the
        # end of the source, which keeps the intro/outro compatible.
        transition = smoothstep((local_bar - 0.82) / 0.18)
        chord = interpolated_chord(current, following, transition)
        energy = section_energy(bar_index)
        arc = 0.5 - 0.5 * math.cos(2.0 * math.pi * time / DURATION)
        breathing = 0.90 + 0.10 * math.sin(2.0 * math.pi * time / 8.0)

        pad = 0.0
        for voice_index, midi_note in enumerate(chord):
            voice_frequency = hz(int(round(midi_note)))
            pad += pad_voice(voice_frequency, time) * (0.075 if voice_index < 3 else 0.045)
        pad *= energy * breathing * (0.82 + 0.18 * arc)

        # A continuous D/A foundation makes the music feel like one world,
        # rather than a sequence of unrelated generated chords.
        drone = (
            0.085 * pad_voice(hz(38), time)
            + 0.045 * pad_voice(hz(45), time)
            + 0.025 * pad_voice(hz(50), time)
        ) * (0.82 + 0.18 * breathing)

        # Two broad pulses per 6/8 bar. They are deliberately quiet and only
        # become clearly present during the middle rise.
        eighth_index = int(local_bar * 6.0)
        local_eighth = (local_bar * 6.0 - eighth_index) * EIGHTH
        pulse = 0.0
        if eighth_index in (0, 3):
            root = hz(CHORDS[chord_name][0]) / 2.0
            pulse = low_pulse(root, local_eighth) * 0.13 * energy

        pluck_left = 0.0
        pluck_right = 0.0
        lead = 0.0

        # Main motif enters after the introduction and returns with variations.
        if 8 <= bar_index < 64 and bar_index % 2 == 0:
            pattern = MOTIF if bar_index % 4 == 0 else ANSWER
            octave = 0 if bar_index < 24 else (12 if bar_index >= 40 else 0)
            for note_index, position in enumerate(MOTIF_POSITIONS):
                event_time = bar_index * BAR + position * EIGHTH
                age = time - event_time
                pluck = pluck_voice(hz(pattern[note_index] + octave), age)
                pan = -0.36 if note_index % 2 == 0 else 0.36
                pluck_left += pluck * (0.34 - pan * 0.10) * energy
                pluck_right += pluck * (0.34 + pan * 0.10) * energy

        # The development adds a sustained answer, not a second unrelated theme.
        if 24 <= bar_index < 56 and bar_index % 4 == 1:
            lead_notes = (71, 69, 67, 65) if bar_index < 40 else (74, 71, 69, 67)
            lead_note = lead_notes[(bar_index // 4) % len(lead_notes)]
            lead_start = bar_index * BAR + EIGHTH
            lead = lead_voice(hz(lead_note), time - lead_start, EIGHTH * 4.0) * 0.17 * energy

        # A very quiet high colour appears only at the centre of the rise.
        shimmer = 0.0
        if 40 <= bar_index < 56:
            shimmer_frequency = hz(83 if bar_index % 2 == 0 else 86)
            shimmer = pad_voice(shimmer_frequency, time) * 0.012 * arc

        # Keep the texture organic without adding audible hiss: this is a slow,
        # low-level air bed, not a white-noise effect.
        noise = noise * 0.985 + rng.uniform(-1.0, 1.0) * 0.015
        air = noise * 0.0035 * (0.5 + 0.5 * energy)

        center = pad + drone + pulse + lead + shimmer + air
        left[sample_index] = center + pluck_left
        right[sample_index] = center + pluck_right

    return make_loopable(left, right)


def make_loopable(left, right):
    """Move the midpoint to the loop boundary and crossfade the other seam."""
    split = (len(left) // 2 // BAR_SAMPLES) * BAR_SAMPLES
    crossfade = BAR_SAMPLES * 2
    a_left, b_left = left[:split], left[split:]
    a_right, b_right = right[:split], right[split:]

    out_left = array("f")
    out_right = array("f")
    out_left.extend(b_left[:-crossfade])
    out_right.extend(b_right[:-crossfade])

    for index in range(crossfade):
        amount = index / max(1, crossfade - 1)
        # Equal-power crossfade avoids a dip where the sections meet.
        left_weight = math.cos(amount * math.pi / 2.0)
        right_weight = math.sin(amount * math.pi / 2.0)
        out_left.append(b_left[-crossfade + index] * left_weight + a_left[index] * right_weight)
        out_right.append(b_right[-crossfade + index] * left_weight + a_right[index] * right_weight)

    out_left.extend(a_left[crossfade:])
    out_right.extend(a_right[crossfade:])
    return out_left, out_right


def write_stereo_wav(path, left, right):
    peak = 1e-9
    for index in range(len(left)):
        peak = max(peak, abs(left[index]), abs(right[index]))
    gain = min(0.78 / peak, 1.0)

    with wave.open(path, "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        chunk_size = 8192
        for start in range(0, len(left), chunk_size):
            end = min(len(left), start + chunk_size)
            frames = bytearray()
            for index in range(start, end):
                frames.extend(struct.pack(
                    "<hh",
                    int(max(-1.0, min(1.0, left[index] * gain)) * 32767),
                    int(max(-1.0, min(1.0, right[index] * gain)) * 32767),
                ))
            wav.writeframes(frames)


def render_rune_sound():
    """A non-bell fifth option: a low rune pulse with a short magical tail."""
    duration = 0.38
    samples = []
    rng = random.Random(99)
    for index in range(int(duration * 44100)):
        time = index / 44100
        attack = min(1.0, time / 0.012)
        low = attack * math.exp(-time * 9.0) * math.sin(2.0 * math.pi * 156.0 * time)
        sweep_frequency = 280.0 + 420.0 * min(1.0, time / 0.20)
        sweep = attack * math.exp(-time * 8.0) * math.sin(2.0 * math.pi * sweep_frequency * time)
        texture = rng.uniform(-1.0, 1.0) * math.exp(-time * 28.0) * 0.035
        samples.append(0.72 * low + 0.30 * sweep + texture)
    return samples


def write_mono_sfx(path, samples, sample_rate=44100):
    peak = max(max(abs(sample) for sample in samples), 1e-9)
    gain = min(0.78 / peak, 1.0)
    with wave.open(path, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        pcm = bytearray()
        for sample in samples:
            pcm.extend(struct.pack("<h", int(max(-1.0, min(1.0, sample * gain)) * 32767)))
        wav.writeframes(pcm)


if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    score_left, score_right = render_score()
    write_stereo_wav(os.path.join(OUTPUT_DIR, "menu-music.wav"), score_left, score_right)
    write_mono_sfx(os.path.join(OUTPUT_DIR, "button-rune.wav"), render_rune_sound())
    print(f"menu-music.wav: {len(score_left) / SAMPLE_RATE:.2f}s")
    print("button-rune.wav: generated")
