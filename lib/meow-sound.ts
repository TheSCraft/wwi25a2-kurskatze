let context: AudioContext | undefined;

// Resume in the click handler, before waiting for the server (mobile browsers).
export function prepareMeow() {
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => {});
  } catch {
    // The interaction still works when audio is unavailable.
  }
}

export function playMeow() {
  if (!context || context.state !== "running") return;
  const audio = context;
  const start = audio.currentTime;
  const voice = audio.createOscillator();
  const filter = audio.createBiquadFilter();
  const envelope = audio.createGain();
  const vibrato = audio.createOscillator();
  const vibratoDepth = audio.createGain();

  // Soft harmonics and a moving vowel filter turn the pitch glide into "mi-aow".
  voice.setPeriodicWave(audio.createPeriodicWave(
    new Float32Array([0, 0, 0, 0, 0, 0]),
    new Float32Array([0, 1, 0.35, 0.2, 0.09, 0.04]),
  ));
  voice.frequency.setValueAtTime(510, start);
  voice.frequency.exponentialRampToValueAtTime(790, start + 0.14);
  voice.frequency.exponentialRampToValueAtTime(650, start + 0.3);
  voice.frequency.exponentialRampToValueAtTime(330, start + 0.78);
  filter.type = "lowpass";
  filter.Q.value = 2;
  filter.frequency.setValueAtTime(2400, start);
  filter.frequency.exponentialRampToValueAtTime(850, start + 0.8);
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(0.14, start + 0.07);
  envelope.gain.setValueAtTime(0.12, start + 0.24);
  envelope.gain.exponentialRampToValueAtTime(0.001, start + 0.82);
  vibrato.frequency.value = 22;
  vibratoDepth.gain.value = 7;
  vibrato.connect(vibratoDepth).connect(voice.frequency);
  voice.connect(filter).connect(envelope).connect(audio.destination);
  voice.start(start);
  vibrato.start(start);
  voice.stop(start + 0.85);
  vibrato.stop(start + 0.85);
  voice.onended = () => {
    voice.disconnect();
    filter.disconnect();
    envelope.disconnect();
    vibrato.disconnect();
    vibratoDepth.disconnect();
  };
}
