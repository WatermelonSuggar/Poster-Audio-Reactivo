let recorder;
let recordedChunks = [];
let recordingStream = null;
let isRecording = false;

function recorderInit() {
  recordedChunks = [];
  isRecording = false;
}

function getAudioTrackForRecording() {
  if (typeof getRecordingAudioTrack !== "function") return null;
  return getRecordingAudioTrack();
}

function startCanvasRecording() {
  if (isRecording) return;

  const canvasEl = document.querySelector("canvas");
  if (!canvasEl) {
    console.warn("No se encontró el canvas para grabar.");
    return;
  }

  // Captura de video del canvas
  const canvasStream = canvasEl.captureStream(30);

  // Stream final que combinará video + audio
  recordingStream = new MediaStream();

  // Agregar track de video
  const videoTracks = canvasStream.getVideoTracks();
  videoTracks.forEach(track => recordingStream.addTrack(track));

  // Agregar track de audio si existe
  const audioTrackForRecording = getAudioTrackForRecording();
  if (audioTrackForRecording) {
    recordingStream.addTrack(audioTrackForRecording);
  } else {
    console.warn("No se encontró track de audio. Se grabará solo video.");
  }

  recordedChunks = [];

  recorder = new MediaRecorder(recordingStream, {
    mimeType: "video/webm;codecs=vp9,opus"
  });

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  recorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.download = `grabacion-canvas-${stamp}.webm`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    if (recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop());
      recordingStream = null;
    }

    isRecording = false;
    console.log("Grabación finalizada y descargada.");
  };

  recorder.start(200);
  isRecording = true;
  console.log("Grabación iniciada.");
}

function stopCanvasRecording() {
  if (!recorder || !isRecording) return;
  recorder.stop();
}

function toggleCanvasRecording() {
  if (isRecording) {
    stopCanvasRecording();
  } else {
    startCanvasRecording();
  }
}
