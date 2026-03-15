let recordDestination;
let audioTrack;
let fft;
let amp;

const audioState = {
  ready: false,
  playing: false,
  level: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  spectrum: [],
  waveform: []
};

function audioPreload() {
  audioTrack = loadSound(APP_CONFIG.audio.file);
}

function audioInit() {
  fft = new p5.FFT(0.85, 1024);
  amp = new p5.Amplitude();

  fft.setInput(audioTrack);
  amp.setInput(audioTrack);

  audioTrack.setVolume(APP_CONFIG.audio.volume);

  // Crear destino para grabación
  const audioContext = getAudioContext();
  recordDestination = audioContext.createMediaStreamDestination();

  // Conectar salida del sonido al destino de grabación
  if (audioTrack.output && audioTrack.output.connect) {
    audioTrack.output.connect(recordDestination);
  }

  audioState.ready = true;
}

function audioStart() {
  if (!audioState.ready) return;
  if (!audioTrack.isPlaying()) {
    audioTrack.loop();
    audioState.playing = true;
  }
}

function audioToggle() {
  if (!audioState.ready) return;

  if (audioTrack.isPlaying()) {
    audioTrack.pause();
    audioState.playing = false;
  } else {
    audioTrack.loop();
    audioState.playing = true;
  }
}

function audioUpdate() {
  if (!audioState.ready) return;

  if (!audioTrack || !audioTrack.isLoaded()) return;

  audioState.level = amp.getLevel();

  fft.analyze();
  audioState.bass = fft.getEnergy("bass") / 255;
  audioState.mid = fft.getEnergy("mid") / 255;
  audioState.treble = fft.getEnergy("treble") / 255;
  audioState.waveform = fft.waveform();
  audioState.spectrum = fft.analyze();
}

function getRecordingAudioTrack() {
  if (!recordDestination) return null;

  const tracks = recordDestination.stream.getAudioTracks();
  if (!tracks || tracks.length === 0) return null;

  return tracks[0];
}
