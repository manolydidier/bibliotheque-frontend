// src/pages/media-library/Visualiseur/FilePreview/VideoPreview.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  FaPlay,
  FaPause,
  FaVolumeUp,
  FaVolumeMute,
  FaExpand,
  FaCompress,
  FaExclamationCircle,
  FaDownload,
  FaClosedCaptioning,
} from "react-icons/fa";

export default function VideoPreview({
  src,
  type,
  poster,
  sources = [],            // [{src, type}]
  subtitles = [],         // [{src, label, srcLang}] facultatif
  autoSubtitles = true,   // deviner .vtt à partir de la source
  height = "70vh",
  allowDownload = true,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const barRef = useRef(null);

  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(!!src || sources.length > 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);

  const [volume, setVolume] = useState(1);
  const [isSeeking, setIsSeeking] = useState(false);
  const [hoverX, setHoverX] = useState(0);
  const [ripples, setRipples] = useState([]); // [{id, x}]

  const [ccAvailable, setCcAvailable] = useState(false);
  const [ccOn, setCcOn] = useState(true);

  // ---------- helpers ----------
  const guessVttFromUrl = (u) => {
    if (!u) return null;
    try {
      // garde la query si présente
      const [base, q] = String(u).split("?");
      const lastDot = base.lastIndexOf(".");
      const vtt =
        lastDot > -1 ? `${base.slice(0, lastDot)}.vtt` : `${base}.vtt`;
      return q ? `${vtt}?${q}` : vtt;
    } catch {
      return null;
    }
  };

  const finalSources = useMemo(() => {
    const list = [...(sources || [])];
    if (src) list.unshift({ src, type });
    const seen = new Set();
    return list.filter((s) => {
      if (!s?.src) return false;
      const key = String(s.src);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [src, type, sources]);

  const activeSrc = finalSources[0]?.src || null;

  // pistes sous-titres : combine manuelles + auto devinée
  const finalTracks = useMemo(() => {
    const arr = [...(subtitles || [])];
    if (autoSubtitles && activeSrc) {
      const auto = guessVttFromUrl(activeSrc);
      if (auto) {
        // évite doublons si déjà fourni
        const exists = arr.some((t) => t?.src === auto);
        if (!exists) {
          arr.unshift({
            src: auto,
            label: "Français (auto)",
            srcLang: "fr",
          });
        }
      }
    }
    // filtre objets valides
    return arr.filter((t) => t && t.src);
  }, [subtitles, autoSubtitles, activeSrc]);

  const pct = duration > 0 ? currentTime / duration : 0;
  const bufferedPct = duration > 0 ? bufferedEnd / duration : 0;

  const formatTime = (seconds) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = String(s % 60).padStart(2, "0");
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
  };

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, []);

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !isMuted;
    setIsMuted(el.muted);
  };

  const toggleFullscreen = () => {
    const target = containerRef.current;
    if (!target) return;
    if (!document.fullscreenElement) {
      target.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const toggleCc = () => {
    const el = videoRef.current;
    if (!el || !el.textTracks) return;
    const turnOn = !ccOn;
    for (const track of el.textTracks) {
      track.mode = turnOn ? "showing" : "hidden";
    }
    setCcOn(turnOn);
  };

  const setVideoTimeFromClientX = (clientX) => {
    if (!barRef.current || !videoRef.current || duration <= 0) return;
    const rect = barRef.current.getBoundingClientRect();
    const clamped = Math.min(Math.max(clientX, rect.left), rect.right);
    const percent = (clamped - rect.left) / rect.width;
    videoRef.current.currentTime = percent * duration;
  };

  const startSeek = (clientX) => {
    setIsSeeking(true);
    setVideoTimeFromClientX(clientX);
    spawnRipple(clientX);
    window.addEventListener("mousemove", moveSeek);
    window.addEventListener("mouseup", endSeek);
    window.addEventListener("touchmove", moveSeekTouch, { passive: false });
    window.addEventListener("touchend", endSeekTouch);
  };

  const moveSeek = (e) => {
    e.preventDefault();
    setVideoTimeFromClientX(e.clientX);
  };
  const endSeek = () => {
    setIsSeeking(false);
    window.removeEventListener("mousemove", moveSeek);
    window.removeEventListener("mouseup", endSeek);
  };
  const moveSeekTouch = (e) => {
    e.preventDefault();
    const t = e.touches?.[0];
    if (!t) return;
    setVideoTimeFromClientX(t.clientX);
  };
  const endSeekTouch = () => {
    setIsSeeking(false);
    window.removeEventListener("touchmove", moveSeekTouch);
    window.removeEventListener("touchend", endSeekTouch);
  };

  const spawnRipple = (clientX) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(clientX, rect.left), rect.right) - rect.left;
    const id = Math.random().toString(36).slice(2);
    setRipples((rs) => [...rs, { id, x }]);
    setTimeout(() => {
      setRipples((rs) => rs.filter((r) => r.id !== id));
    }, 900);
  };

  // auto-hide controls
  useEffect(() => {
    let timeout;
    const handleMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      if (isPlaying && !isSeeking) {
        timeout = setTimeout(() => setShowControls(false), 2200);
      }
    };
    const c = containerRef.current;
    if (c) {
      c.addEventListener("mousemove", handleMove);
      c.addEventListener("mouseleave", () => isPlaying && setShowControls(false));
    }
    return () => {
      clearTimeout(timeout);
      if (c) {
        c.removeEventListener("mousemove", handleMove);
      }
    };
  }, [isPlaying, isSeeking]);

  // fullscreen listener
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (["input", "textarea", "select"].includes(tag)) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key.toLowerCase() === "m") {
        toggleMute();
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      } else if (e.key === "ArrowRight") {
        videoRef.current && (videoRef.current.currentTime += 5);
      } else if (e.key === "ArrowLeft") {
        videoRef.current && (videoRef.current.currentTime -= 5);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay]);

  // hover position
  const onBarMouseMove = (e) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoverX(Math.min(Math.max(e.clientX - rect.left, 0), rect.width));
  };

  // video events
  const onLoadedMetadata = () => {
    const el = videoRef.current;
    if (!el) return;
    setDuration(el.duration || 0);
    setIsLoading(false);
  };

  const onTimeUpdate = () => {
    const el = videoRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);
    // buffered
    try {
      const b = el.buffered;
      if (b && b.length) {
        setBufferedEnd(b.end(b.length - 1));
      }
    } catch {}
  };

  const onVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    const el = videoRef.current;
    if (el) {
      el.volume = v;
      el.muted = v === 0;
    }
    setIsMuted(v === 0);
  };

  // gérer l’état des pistes sous-titres quand la source change
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const check = () => {
      const has = el.textTracks && el.textTracks.length > 0;
      setCcAvailable(has);
      // active par défaut si dispo
      for (const track of el.textTracks || []) {
        track.mode = ccOn ? "showing" : "hidden";
      }
    };
    // petit délai pour laisser le DOM attacher <track>
    const t = setTimeout(check, 0);
    return () => clearTimeout(t);
  }, [activeSrc, finalTracks.length, ccOn]);

  if (!finalSources.length) {
    return (
      <div className="flex items-center justify-center h-48 rounded-2xl bg-slate-50 border border-slate-200/40">
        <div className="text-center">
          <FaPlay className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">Aucune vidéo disponible</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-48 rounded-2xl bg-red-50 border border-red-200/40">
        <div className="text-center px-4">
          <FaExclamationCircle className="w-12 h-12 mx-auto text-red-400 mb-2" />
          <p className="text-sm text-red-600 font-medium mb-1">Erreur de chargement</p>
          <p className="text-xs text-red-500">Impossible de lire cette vidéo</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden border border-slate-200/50 bg-black shadow-2xl"
      style={{ maxHeight: height }}
    >
      {/* Styles: piste ::cue */}
      <style>{`
        video::cue {
          background: rgba(0,0,0,.45);
          color: #fff;
          text-shadow: 0 1px 2px rgba(0,0,0,.6);
          padding: .1em .35em;
          line-height: 1.35;
          font-size: 0.95rem;
          border-radius: .25rem;
        }
      `}</style>

      {/* VIDEO */}
      <video
        ref={videoRef}
        className="w-full max-h-[70vh] object-contain bg-black"
        poster={poster}
        preload="metadata"
        controls={false}
        playsInline
        onClick={togglePlay}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        onLoadedData={() => setIsLoading(false)}
      >
        {finalSources.map((s, i) => (
          <source key={i} src={s.src} type={s.type || undefined} />
        ))}

        {/* Tracks sous-titres */}
        {finalTracks.map((t, i) => (
          <track
            key={i}
            kind="subtitles"
            src={t.src}
            label={t.label || t.srcLang?.toUpperCase() || "CC"}
            srcLang={t.srcLang || "fr"}
            default={i === 0} // active par défaut la première
          />
        ))}

        <p className="text-white p-4">
          Votre navigateur ne supporte pas la lecture de vidéos HTML5.
        </p>
      </video>

      {/* LOADING */}
      {isLoading && (
        <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-slate-400/40 border-t-white rounded-full animate-spin" />
            <p className="text-sm text-slate-200">Chargement…</p>
          </div>
        </div>
      )}

      {/* OVERLAY PLAY */}
      {!isLoading && !isPlaying && (
        <div
          className="absolute inset-0 grid place-items-center bg-black/20 cursor-pointer transition-opacity"
          onClick={togglePlay}
          title="Lire (Espace)"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full scale-150"
                 style={{ background: "conic-gradient(from 200deg at 50% 50%, rgba(59,130,246,.45), rgba(16,185,129,.35), rgba(139,92,246,.35), rgba(59,130,246,.45))", filter: "blur(10px)", opacity: .45 }} />
            <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 backdrop-blur-md grid place-items-center"
                 style={{ boxShadow: "0 10px 25px -10px rgba(59,130,246,.6), inset 0 2px 6px rgba(255,255,255,.45), inset 0 -6px 12px rgba(0,0,0,.25)" }}>
              <FaPlay className="w-8 h-8 text-white ml-1" />
            </div>
            <div className="absolute inset-0 rounded-full"
                 style={{ background: "radial-gradient(120% 140% at 30% 10%, rgba(255,255,255,.8) 0%, rgba(255,255,255,.2) 35%, rgba(255,255,255,0) 60%)" }} />
          </div>
        </div>
      )}

      {/* CONTROLS */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* PROGRESS ZONE */}
        <div
          ref={barRef}
          className="relative h-10 px-4 flex items-center bg-gradient-to-t from-black/85 via-black/55 to-transparent"
          onMouseMove={onBarMouseMove}
          onMouseDown={(e) => startSeek(e.clientX)}
          onTouchStart={(e) => startSeek(e.touches?.[0]?.clientX ?? 0)}
        >
          <div className="relative w-full h-2 rounded-full bg-white/10 border border-white/10 overflow-visible">
            {/* buffered */}
            <div
              className="absolute h-full bg-white/20"
              style={{ width: `${bufferedPct * 100}%` }}
            />
            {/* progress */}
            <div className="relative h-full" style={{ filter: "url(#goo)" }}>
              <div
                className="absolute h-[140%] -top-[20%] left-0 rounded-full"
                style={{
                  width: `${Math.max(0.001, pct * 100)}%`,
                  background:
                    "linear-gradient(90deg, rgba(59,130,246,0.95), rgba(16,185,129,0.9), rgba(99,102,241,0.95))",
                }}
              />
              {/* thumb */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full w-5 h-5 ${
                  isSeeking ? "scale-110" : "scale-100"
                } transition-transform duration-150`}
                style={{
                  left: `calc(${pct * 100}% )`,
                  background:
                    "radial-gradient(120% 140% at 30% 10%, rgba(255,255,255,.9) 0%, rgba(255,255,255,.3) 35%, rgba(255,255,255,0) 60%), linear-gradient(180deg, #ffffff 0%, #c7d2fe 100%)",
                  boxShadow:
                    "0 10px 25px -10px rgba(59,130,246,.7), inset 0 2px 6px rgba(255,255,255,.6), inset 0 -8px 16px rgba(59,130,246,.25)",
                }}
              />
              {/* bulle hover (aimantation) */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full w-3 h-3 opacity-60"
                style={{
                  left: `calc(${hoverX}px)`,
                  background: "linear-gradient(180deg, rgba(255,255,255,.8), rgba(255,255,255,.2))",
                }}
              />
            </div>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="flex items-center gap-4 px-4 py-3 bg-gradient-to-t from-black/85 via-black/60 to-transparent">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="text-white hover:text-blue-400 transition-colors"
            title="Lecture/Pause (Espace)"
          >
            {isPlaying ? <FaPause className="w-5 h-5" /> : <FaPlay className="w-5 h-5" />}
          </button>

          {/* Time */}
          <div className="text-white/90 text-xs sm:text-sm font-medium tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          <div className="flex-1" />

          {/* CC */}
          <button
            disabled={!ccAvailable}
            onClick={toggleCc}
            className={`transition-colors ${ccAvailable ? "text-white hover:text-blue-400" : "text-white/30 cursor-not-allowed"}`}
            title={ccAvailable ? (ccOn ? "Masquer les sous-titres" : "Afficher les sous-titres") : "Aucun sous-titre"}
          >
            <FaClosedCaptioning className={`w-5 h-5 ${ccOn && ccAvailable ? "drop-shadow-[0_0_6px_rgba(59,130,246,.7)]" : ""}`} />
          </button>

          {/* Volume */}
          <div className="flex items-center gap-2 group/volume">
            <button
              onClick={toggleMute}
              className="text-white hover:text-blue-400 transition-colors"
              title="Muet (M)"
            >
              {isMuted || volume === 0 ? (
                <FaVolumeMute className="w-5 h-5" />
              ) : (
                <FaVolumeUp className="w-5 h-5" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={onVolumeChange}
              className="w-0 group-hover/volume:w-24 transition-all duration-200 opacity-0 group-hover/volume:opacity-100 accent-blue-500"
            />
          </div>

          {/* Download */}
          {allowDownload && activeSrc && (
            <a
              href={activeSrc}
              download
              className="text-white hover:text-blue-400 transition-colors"
              title="Télécharger"
            >
              <FaDownload className="w-5 h-5" />
            </a>
          )}

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="text-white hover:text-blue-400 transition-colors"
            title="Plein écran (F)"
          >
            {isFullscreen ? (
              <FaCompress className="w-5 h-5" />
            ) : (
              <FaExpand className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
