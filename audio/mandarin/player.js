/**
 * Mandarin audio: play model clips + record-and-compare (in-memory only).
 * Adapted from the Ace Cantonese player. Lesson pages live at
 * lessons/YYYY-MM-DD/mandarin.html; clips live in ../../audio/mandarin/.
 *
 * Usage after buildCards():
 *   KevinMandarinAudio.wireLesson({ playAllBtn: "#playAll", stopBtn: "#stopAudio" });
 *
 * Each vocabulary card should have data-audio="filename.mp3" and a .practice mount
 * (player injects Record / Play my try / Play model controls there).
 *
 * Autoplay: browsers require a user tap — every play starts from a button click.
 * Mic: MediaRecorder + getUserMedia; denial shows a clear allow-mic message.
 * Recordings stay in memory for this page visit only — nothing is uploaded.
 */
(function (global) {
  var BASE = "../../audio/mandarin/";
  var current = null;
  var recordings = Object.create(null); // key -> blob URL (page visit only)
  var activeRec = null; // { recorder, stream, key, timer, chunks }

  function stopPlayback() {
    if (current) {
      try { current.pause(); } catch (e) {}
      try { current.currentTime = 0; } catch (e) {}
      current = null;
    }
  }

  function playSrc(src) {
    stopPlayback();
    var a = new Audio(src);
    current = a;
    var p = a.play();
    if (p && p.catch) p.catch(function () {});
    a.addEventListener("ended", function () {
      if (current === a) current = null;
    });
    return a;
  }

  function playFile(filename) {
    if (!filename) return null;
    return playSrc(BASE + filename);
  }

  function pickMime() {
    var types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/aac",
      "audio/ogg"
    ];
    if (!global.MediaRecorder || !MediaRecorder.isTypeSupported) return "";
    for (var i = 0; i < types.length; i++) {
      if (MediaRecorder.isTypeSupported(types[i])) return types[i];
    }
    return "";
  }

  function micDeniedMsg(el) {
    if (!el) return;
    el.innerHTML =
      '🎤 Microphone blocked. Allow the microphone for this site ' +
      '(the address-bar lock icon, or your browser site settings), ' +
      'then tap Record again.';
    el.hidden = false;
  }

  function setRecStatus(el, text, recording) {
    if (!el) return;
    el.textContent = text || "";
    el.hidden = !text;
    el.classList.toggle("rec-on", !!recording);
  }

  function stopRecording(save) {
    if (!activeRec) return;
    var rec = activeRec;
    activeRec = null;
    if (rec.timer) clearTimeout(rec.timer);
    try {
      if (rec.recorder && rec.recorder.state !== "inactive") {
        if (!save) {
          rec.recorder.ondataavailable = null;
          rec.recorder.onstop = function () {
            try { rec.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
          };
        }
        rec.recorder.stop();
      } else {
        try { rec.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      }
    } catch (e) {}
  }

  function startRecording(key, ui) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      micDeniedMsg(ui.msg);
      setRecStatus(ui.status, "Recording not supported on this browser.", false);
      return;
    }
    if (!global.MediaRecorder) {
      micDeniedMsg(ui.msg);
      setRecStatus(ui.status, "Recording not supported on this browser.", false);
      return;
    }
    // Stop any other recording / playback first
    stopRecording(false);
    stopPlayback();

    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(function (stream) {
      var mime = pickMime();
      var opts = mime ? { mimeType: mime } : undefined;
      var recorder;
      try {
        recorder = opts ? new MediaRecorder(stream, opts) : new MediaRecorder(stream);
      } catch (err) {
        stream.getTracks().forEach(function (t) { t.stop(); });
        micDeniedMsg(ui.msg);
        return;
      }
      var chunks = [];
      recorder.ondataavailable = function (ev) {
        if (ev.data && ev.data.size) chunks.push(ev.data);
      };
      recorder.onstop = function () {
        try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
        if (!chunks.length) {
          setRecStatus(ui.status, "No audio captured — try again.", false);
          ui.btn.classList.remove("recording");
          ui.btn.setAttribute("aria-pressed", "false");
          ui.btn.innerHTML = '<span aria-hidden="true">🎙️</span> Record';
          return;
        }
        var blob = new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" });
        if (recordings[key]) {
          try { URL.revokeObjectURL(recordings[key]); } catch (e) {}
        }
        recordings[key] = URL.createObjectURL(blob);
        setRecStatus(ui.status, "Got it! Tap Play my try, then Play model.", false);
        ui.btn.classList.remove("recording");
        ui.btn.setAttribute("aria-pressed", "false");
        ui.btn.innerHTML = '<span aria-hidden="true">🎙️</span> Record again';
        ui.playMine.disabled = false;
        ui.playMine.hidden = false;
        ui.playModel.hidden = false;
        if (ui.msg) ui.msg.hidden = true;
      };

      activeRec = { recorder: recorder, stream: stream, key: key, chunks: chunks, timer: null };
      recorder.start();
      ui.btn.classList.add("recording");
      ui.btn.setAttribute("aria-pressed", "true");
      ui.btn.innerHTML = '<span aria-hidden="true">⏹️</span> Stop';
      setRecStatus(ui.status, "Recording… say the word clearly! (auto-stops in 3s)", true);
      if (ui.msg) ui.msg.hidden = true;

      activeRec.timer = setTimeout(function () {
        if (activeRec && activeRec.key === key) stopRecording(true);
      }, 3000);
    }).catch(function () {
      micDeniedMsg(ui.msg);
      setRecStatus(ui.status, "", false);
    });
  }

  function toggleRecord(key, ui) {
    if (activeRec && activeRec.key === key) {
      stopRecording(true);
      return;
    }
    startRecording(key, ui);
  }

  function buildPractice(card, filename, label) {
    var mount = card.querySelector(".practice");
    if (!mount) {
      mount = document.createElement("div");
      mount.className = "practice";
      card.appendChild(mount);
    }
    if (mount.getAttribute("data-practice-ready")) return;
    mount.setAttribute("data-practice-ready", "1");

    var key = filename;
    var row = document.createElement("div");
    row.className = "practice-row";

    var hear = document.createElement("button");
    hear.type = "button";
    hear.className = "speak";
    hear.setAttribute("aria-label", "Play model: " + label);
    hear.innerHTML = '<span aria-hidden="true">🔊</span> Hear model';
    hear.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      playFile(filename);
    });

    var recBtn = document.createElement("button");
    recBtn.type = "button";
    recBtn.className = "record";
    recBtn.setAttribute("aria-label", "Record your try: " + label);
    recBtn.setAttribute("aria-pressed", "false");
    recBtn.innerHTML = '<span aria-hidden="true">🎙️</span> Record';

    var playMine = document.createElement("button");
    playMine.type = "button";
    playMine.className = "play-mine";
    playMine.hidden = true;
    playMine.disabled = true;
    playMine.innerHTML = '<span aria-hidden="true">▶️</span> Play my try';
    playMine.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (recordings[key]) playSrc(recordings[key]);
    });

    var playModel = document.createElement("button");
    playModel.type = "button";
    playModel.className = "play-model";
    playModel.hidden = true;
    playModel.innerHTML = '<span aria-hidden="true">🔊</span> Play model';
    playModel.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      playFile(filename);
    });

    var status = document.createElement("div");
    status.className = "rec-status";
    status.hidden = true;

    var msg = document.createElement("div");
    msg.className = "mic-msg";
    msg.hidden = true;

    var ui = { btn: recBtn, playMine: playMine, playModel: playModel, status: status, msg: msg };
    recBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleRecord(key, ui);
    });

    row.appendChild(hear);
    row.appendChild(recBtn);
    row.appendChild(playMine);
    row.appendChild(playModel);
    mount.appendChild(row);
    mount.appendChild(status);
    mount.appendChild(msg);
  }

  function wireLesson(opts) {
    opts = opts || {};
    if (opts.base) BASE = opts.base;

    document.querySelectorAll("[data-audio]").forEach(function (el) {
      var file = el.getAttribute("data-audio");
      if (!file) return;
      var label = el.getAttribute("data-audio-label") || file;
      buildPractice(el, file, label);
    });

    function bind(sel, fn) {
      var node = typeof sel === "string" ? document.querySelector(sel) : sel;
      if (node && !node.getAttribute("data-audio-wired")) {
        node.setAttribute("data-audio-wired", "1");
        node.addEventListener("click", fn);
      }
    }
    bind(opts.playAllBtn || "#playAll", function () {
      stopRecording(false);
      playFile(opts.allFile || "ALL-words.mp3");
    });
    bind(opts.stopBtn || "#stopAudio", function () {
      stopRecording(false);
      stopPlayback();
    });
  }

  var api = {
    setBase: function (b) { BASE = b; },
    play: playFile,
    playAll: function () { return playFile("ALL-words.mp3"); },
    stop: function () { stopRecording(false); stopPlayback(); },
    wireLesson: wireLesson
  };
  global.KevinMandarinAudio = api;
})(window);
