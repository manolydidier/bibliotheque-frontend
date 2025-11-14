import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';

// ============= Configuration & Constants =============
const THEMES_ORDER = [
  'book', 'github', 'netflix', 'terminal', 'stripe', 'cloudflare', 'medium',
  'slack', 'discord', 'apple', 'notion'
];

const STORAGE_KEYS = {
  THEME: 'nf:theme',
  DARK: 'nf:dark',
  LEADERBOARD: 'nf:leaderboard',
  DIFFICULTY: 'nf:difficulty',
  GAME_TYPE: 'nf:game',
  ASSIST: 'nf:assist',
  VISITS: 'nf:visits',
  LAST_GAME_STATS: 'nf:lastGameStats'
};

const GAMES = {
  CATCH: 'catchbook',
  BREAKOUT: 'breakout',
  PONG: 'pong',
  FLAPPY: 'flappy'
};

// ============= Utility Functions =============
const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
};

// Track 404 visits
const track404Visit = (pathname) => {
  const visits = storage.get(STORAGE_KEYS.VISITS, []);
  visits.push({
    path: pathname,
    timestamp: Date.now(),
    referrer: document.referrer || 'direct'
  });
  // Keep last 50 visits
  storage.set(STORAGE_KEYS.VISITS, visits.slice(-50));
};

// ============= Main Component =============
export default function NotFoundPage({ variant: variantProp = 'book' }) {
  const urlParams = new URLSearchParams(window.location.search);
  
  // ============= State Management =============
  const [state, setState] = useState(() => {
    const qv = urlParams.get('v');
    const savedTheme = storage.get(STORAGE_KEYS.THEME);
    const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    
    return {
      variant: (qv && THEMES_ORDER.includes(qv)) ? qv : (savedTheme || variantProp),
      dark: storage.get(STORAGE_KEYS.DARK, systemDark),
      showGame: false,
      showSnake: false,
      showStats: false,
      assist: storage.get(STORAGE_KEYS.ASSIST, true),
      difficulty: storage.get(STORAGE_KEYS.DIFFICULTY, 'easy'),
      gameType: storage.get(STORAGE_KEYS.GAME_TYPE, GAMES.CATCH),
      redirectCountdown: null
    };
  });

  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // ============= Memoized Values =============
  const currentPath = window.location.pathname;
  
  const suggestions = useMemo(() => {
    const common = ['/articles', '/about', '/contact', '/blog'];
    // Simple fuzzy matching
    return common.filter(path => 
      path.toLowerCase().includes(currentPath.toLowerCase().slice(1, 4))
    );
  }, [currentPath]);

  // ============= Effects =============
  
  // Track visit on mount
  useEffect(() => {
    track404Visit(currentPath);
  }, [currentPath]);

  // Apply dark mode
  useEffect(() => {
    document.documentElement.dataset.nfDark = state.dark ? '1' : '0';
    storage.set(STORAGE_KEYS.DARK, state.dark);
  }, [state.dark]);

  // Persist preferences
  useEffect(() => {
    storage.set(STORAGE_KEYS.THEME, state.variant);
  }, [state.variant]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.DIFFICULTY, state.difficulty);
  }, [state.difficulty]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.GAME_TYPE, state.gameType);
  }, [state.gameType]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.ASSIST, state.assist);
  }, [state.assist]);

  // Auto-redirect if specified
  useEffect(() => {
    const redirParam = urlParams.get('redir');
    const seconds = parseInt(redirParam, 10);
    
    if (Number.isFinite(seconds) && seconds > 0 && seconds <= 60) {
      setState(s => ({ ...s, redirectCountdown: seconds }));
      
      const interval = setInterval(() => {
        setState(s => {
          if (s.redirectCountdown === null) return s;
          if (s.redirectCountdown <= 1) {
            window.location.href = '/';
            return s;
          }
          return { ...s, redirectCountdown: s.redirectCountdown - 1 };
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, []);

  // Konami code detector (refactored)
  useEffect(() => {
    const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let index = 0;
    let timeout;
    
    const handler = (e) => {
      clearTimeout(timeout);
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      
      if (key === KONAMI[index].toLowerCase()) {
        index++;
        if (index === KONAMI.length) {
          setState(s => ({ ...s, showSnake: true }));
          index = 0;
        }
      } else {
        index = key === KONAMI[0].toLowerCase() ? 1 : 0;
      }
      
      // Reset after 2s of inactivity
      timeout = setTimeout(() => index = 0, 2000);
    };
    
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      clearTimeout(timeout);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const key = e.key.toLowerCase();
      
      // Navigation
      if (key === 'h') window.location.href = '/';
      if (key === 'b') window.history.back();
      if (key === 's') setState(s => ({ ...s, showStats: !s.showStats }));
      if (key === 'g') setState(s => ({ ...s, showGame: !s.showGame }));
      
      // Theme switching (0-9, -)
      if (/^[0-9]$/.test(key)) {
        const idx = parseInt(key, 10);
        setState(s => ({ ...s, variant: THEMES_ORDER[idx] || THEMES_ORDER[0] }));
      }
      if (key === '-') {
        setState(s => ({ ...s, variant: THEMES_ORDER[10] }));
      }
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ============= Handlers =============
  const updateState = useCallback((updates) => {
    setState(s => ({ ...s, ...updates }));
  }, []);

  const handleScoreSubmit = useCallback((score, game, difficulty, assist) => {
    if (!Number.isFinite(score) || score <= 0) return;
    
    const leaderboard = storage.get(STORAGE_KEYS.LEADERBOARD, []);
    const entry = {
      score,
      game,
      difficulty,
      assist,
      timestamp: Date.now()
    };
    
    leaderboard.push(entry);
    leaderboard.sort((a, b) => b.score - a.score);
    storage.set(STORAGE_KEYS.LEADERBOARD, leaderboard.slice(0, 20));
    storage.set(STORAGE_KEYS.LAST_GAME_STATS, entry);
  }, []);

  const resetLeaderboard = useCallback(() => {
    if (confirm('Effacer le leaderboard ?')) {
      storage.remove(STORAGE_KEYS.LEADERBOARD);
      storage.remove(STORAGE_KEYS.LAST_GAME_STATS);
    }
  }, []);

  // ============= Render =============
  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--nf-bg)', color: 'var(--nf-fg)', transition: 'background 0.3s, color 0.3s' }}
      aria-labelledby="nf-title"
    >
      <style>{BASE_STYLES(prefersReduced)}</style>

      <div className="w-full max-w-3xl mx-auto">
        {/* Topbar */}
        <Topbar 
          state={state} 
          updateState={updateState}
          suggestions={suggestions}
        />

        {/* Auto-redirect banner */}
        {state.redirectCountdown !== null && (
          <div className="nf-banner" role="alert">
            🔄 Redirection automatique dans <strong>{state.redirectCountdown}s</strong>
            <button onClick={() => updateState({ redirectCountdown: null })} className="nf-chip">Annuler</button>
          </div>
        )}

        {/* Illustration */}
        <div className="nf-card" style={{ display: 'flex', justifyContent: 'center' }}>
          {renderVariant(state.variant)}
        </div>

        <h1 id="nf-title" className="mt-6 text-center text-3xl font-semibold tracking-tight">
          {getTitle(state.variant)}
        </h1>

        <p className="mt-3 text-center text-sm nf-muted">
          {getSubtitle(state.variant, currentPath)}
        </p>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-4 text-center text-sm nf-muted">
            💡 Peut-être cherchiez-vous: {suggestions.map((s, i) => (
              <span key={s}>
                <a href={s} className="nf-link">{s}</a>
                {i < suggestions.length - 1 && ', '}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <ActionButtons state={state} updateState={updateState} />

        {/* Mini-game */}
        {state.showGame && (
          <GameSection 
            state={state} 
            onScore={handleScoreSubmit}
            onReset={resetLeaderboard}
          />
        )}

        {/* Stats modal */}
        {state.showStats && (
          <StatsModal 
            onClose={() => updateState({ showStats: false })}
          />
        )}

        {/* Snake modal */}
        {state.showSnake && (
          <SnakeModal onClose={() => updateState({ showSnake: false })} />
        )}

        {/* Theme selector */}
        <ThemeSelector variant={state.variant} onChange={(v) => updateState({ variant: v })} />

        {/* Footer info */}
        <Footer />
      </div>
    </main>
  );
}

// ============= Sub-components =============

function Topbar({ state, updateState, suggestions }) {
  return (
    <div className="nf-topbar">
      <div className="nf-left">
        <span className="nf-breadcrumb mono">/ 404</span>
        {suggestions.length > 0 && (
          <span className="nf-badge">{suggestions.length} suggestions</span>
        )}
      </div>
      <div className="nf-right">
        <button 
          className="nf-chip" 
          onClick={() => updateState({ dark: !state.dark })}
          title="Toggle dark mode"
        >
          {state.dark ? '☀︎' : '☾'}
        </button>

        <button
          className={`nf-chip ${state.assist ? 'is-active' : ''}`}
          onClick={() => updateState({ assist: !state.assist })}
          title="Assist Mode: gameplay plus facile"
        >
          🛟 {state.assist ? 'ON' : 'OFF'}
        </button>

        <select
          className="nf-chip"
          value={state.difficulty}
          onChange={(e) => updateState({ difficulty: e.target.value })}
          title="Difficulté du jeu"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <select
          className="nf-chip"
          value={state.gameType}
          onChange={(e) => updateState({ gameType: e.target.value })}
          title="Type de mini-jeu"
        >
          <option value={GAMES.CATCH}>📚 CatchBook</option>
          <option value={GAMES.BREAKOUT}>🧱 Breakout</option>
          <option value={GAMES.PONG}>🏓 Pong</option>
          <option value={GAMES.FLAPPY}>🐦 Flappy</option>
        </select>

        <button
          className="nf-chip"
          onClick={() => updateState({ showStats: !state.showStats })}
          title="Statistiques (S)"
        >
          📊
        </button>
      </div>
    </div>
  );
}

function ActionButtons({ state, updateState }) {
  return (
    <div className="mt-8 nf-row">
      <button onClick={() => window.history.back()} className="nf-btn">
        ← Retour <span className="nf-hint">B</span>
      </button>
      <button onClick={() => window.location.href = '/'} className="nf-btn">
        ⌂ Accueil <span className="nf-hint">H</span>
      </button>
      <button onClick={() => window.location.href = '/articles'} className="nf-btn">
        🔎 Articles
      </button>
      <button
        onClick={() => updateState({ showGame: !state.showGame })}
        className="nf-btn"
      >
        {state.showGame ? '✖ Fermer' : '▶ Jouer'} <span className="nf-hint">G</span>
      </button>
      <button 
        onClick={() => updateState({ showSnake: true })} 
        className="nf-btn"
        title="Konami code aussi 😉"
      >
        🐍 Snake
      </button>
    </div>
  );
}

function GameSection({ state, onScore, onReset }) {
  const gameProps = {
    difficulty: state.difficulty,
    assist: state.assist,
    onScore: (s) => onScore(s, state.gameType, state.difficulty, state.assist)
  };

  return (
    <div className="mt-6">
      {state.gameType === GAMES.CATCH && <CatchBookGame {...gameProps} />}
      {state.gameType === GAMES.BREAKOUT && <BreakoutGame {...gameProps} />}
      {state.gameType === GAMES.PONG && <PongGame {...gameProps} />}
      {state.gameType === GAMES.FLAPPY && <FlappyGame {...gameProps} />}
      
      <Leaderboard onReset={onReset} />
      
      <p className="mt-2 text-xs nf-muted center">
        {getGameInstructions(state.gameType, state.assist)}
      </p>
    </div>
  );
}

function getGameInstructions(gameType, assist) {
  const instructions = {
    [GAMES.CATCH]: 'Arrows/WASD pour bouger. Attrape le livre. +1 par catch.',
    [GAMES.BREAKOUT]: '← → / A D pour bouger. Détruis les briques. +1 par brique.',
    [GAMES.PONG]: '↑/↓ (ou W/S) pour bouger. +1 par point marqué.',
    [GAMES.FLAPPY]: 'Espace / Clic pour voler. Passe entre les tuyaux.'
  };
  
  return `${instructions[gameType] || ''} • ${assist ? 'Assist ON' : 'Assist OFF'}`;
}

function ThemeSelector({ variant, onChange }) {
  return (
    <div className="mt-10 nf-themebar">
      {THEMES_ORDER.map((v, i) => (
        <button
          key={v}
          className={`nf-chip ${variant === v ? 'is-active' : ''}`}
          onClick={() => onChange(v)}
          title={`Preset ${i} — ${v}`}
        >
          {i} · {v}
        </button>
      ))}
    </div>
  );
}

function Footer() {
  return (
    <div className="mt-6 grid gap-2 text-xs sm:text-center nf-muted">
      <p>
        Raccourcis: <kbd className="nf-kbd">B</kbd> retour, 
        <kbd className="nf-kbd">H</kbd> accueil, 
        <kbd className="nf-kbd">G</kbd> jeu,
        <kbd className="nf-kbd">S</kbd> stats,
        <kbd className="nf-kbd">0–9</kbd> thèmes
      </p>
      <p className="mono">
        Ref: 404 • {new Date().toISOString().slice(0, 19).replace('T', ' ')}Z
      </p>
    </div>
  );
}

// ============= Leaderboard Component =============
function Leaderboard({ onReset }) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const load = () => setEntries(storage.get(STORAGE_KEYS.LEADERBOARD, []));
    load();
    const interval = setInterval(load, 1000);
    return () => clearInterval(interval);
  }, []);

  if (entries.length === 0) return null;

  return (
    <div className="mono nf-leaderboard" style={{ fontSize: 11, marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <strong>🏆 Leaderboard</strong>
        <button onClick={onReset} className="nf-chip" style={{ fontSize: 10 }}>
          🗑️ Reset
        </button>
      </div>
      <ol style={{ paddingLeft: 16, margin: 0 }}>
        {entries.slice(0, 10).map((e, i) => (
          <li key={i} style={{ marginBottom: 2 }}>
            #{i + 1} — <strong>{e.score}</strong> pts{' '}
            <span style={{ opacity: 0.6 }}>
              ({e.game}/{e.difficulty}{e.assist ? '/assist' : ''})
            </span>{' '}
            · {new Date(e.timestamp).toLocaleTimeString()}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ============= Stats Modal =============
function StatsModal({ onClose }) {
  const visits = storage.get(STORAGE_KEYS.VISITS, []);
  const lastGame = storage.get(STORAGE_KEYS.LAST_GAME_STATS);
  const leaderboard = storage.get(STORAGE_KEYS.LEADERBOARD, []);

  const stats = useMemo(() => {
    const total = visits.length;
    const recent = visits.slice(-10);
    const topPaths = {};
    visits.forEach(v => {
      topPaths[v.path] = (topPaths[v.path] || 0) + 1;
    });
    const sorted = Object.entries(topPaths).sort((a, b) => b[1] - a[1]);

    return {
      total,
      recent,
      topPaths: sorted.slice(0, 5),
      totalGames: leaderboard.length,
      bestScore: leaderboard[0]?.score || 0
    };
  }, [visits, leaderboard]);

  return (
    <div className="nf-modal" onClick={onClose}>
      <div className="nf-modal-body" onClick={(e) => e.stopPropagation()}>
        <div className="nf-modal-head">
          <strong>📊 Statistiques 404</strong>
          <button className="nf-chip" onClick={onClose}>✖</button>
        </div>
        
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          <h3 style={{ marginTop: 12, marginBottom: 6, fontWeight: 600 }}>Visites</h3>
          <p>Total: <strong>{stats.total}</strong> visites 404</p>
          
          {stats.topPaths.length > 0 && (
            <>
              <h4 style={{ marginTop: 8, marginBottom: 4, fontSize: 12, opacity: 0.8 }}>
                Top chemins introuvables:
              </h4>
              <ol style={{ paddingLeft: 20, margin: 0, fontSize: 11 }} className="mono">
                {stats.topPaths.map(([path, count]) => (
                  <li key={path}>{path} — {count}×</li>
                ))}
              </ol>
            </>
          )}

          {stats.recent.length > 0 && (
            <>
              <h4 style={{ marginTop: 12, marginBottom: 4, fontSize: 12, opacity: 0.8 }}>
                Dernières visites:
              </h4>
              <ul style={{ paddingLeft: 20, margin: 0, fontSize: 11 }} className="mono">
                {stats.recent.reverse().slice(0, 5).map((v, i) => (
                  <li key={i}>
                    {v.path} · {new Date(v.timestamp).toLocaleTimeString()}
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3 style={{ marginTop: 16, marginBottom: 6, fontWeight: 600 }}>Mini-jeux</h3>
          <p>Parties jouées: <strong>{stats.totalGames}</strong></p>
          <p>Meilleur score: <strong>{stats.bestScore}</strong> pts</p>
          
          {lastGame && (
            <p style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>
              Dernière partie: {lastGame.score} pts ({lastGame.game}/{lastGame.difficulty})
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============= Snake Modal =============
function SnakeModal({ onClose }) {
  const size = 18;
  const cols = 28, rows = 16;
  const [score, setScore] = useState(0);
  const cvs = useRef(null);
  const state = useRef({
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    body: [{ x: 5, y: 8 }, { x: 4, y: 8 }],
    food: { x: 12, y: 8 },
    gameOver: false
  });

  useEffect(() => {
    const handleKey = (e) => {
      const k = e.key.toLowerCase();
      const s = state.current;
      
      if (k === 'escape') { onClose(); return; }
      if (s.gameOver) return;

      // Queue direction change to prevent instant reversals
      if (k === 'arrowup' && s.dir.y !== 1) s.nextDir = { x: 0, y: -1 };
      if (k === 'arrowdown' && s.dir.y !== -1) s.nextDir = { x: 0, y: 1 };
      if (k === 'arrowleft' && s.dir.x !== 1) s.nextDir = { x: -1, y: 0 };
      if (k === 'arrowright' && s.dir.x !== -1) s.nextDir = { x: 1, y: 0 };
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    const ctx = cvs.current.getContext('2d');
    let lastTime = 0;
    let accumulator = 0;
    const tickInterval = 100;

    const gameLoop = (timestamp) => {
      if (!lastTime) lastTime = timestamp;
      const delta = timestamp - lastTime;
      lastTime = timestamp;
      accumulator += delta;

      while (accumulator >= tickInterval) {
        accumulator -= tickInterval;
        tick();
      }

      draw(ctx);
      requestAnimationFrame(gameLoop);
    };

    const animId = requestAnimationFrame(gameLoop);

    function tick() {
      const s = state.current;
      if (s.gameOver) return;

      // Apply queued direction
      s.dir = { ...s.nextDir };

      const head = {
        x: s.body[0].x + s.dir.x,
        y: s.body[0].y + s.dir.y
      };

      // Check collisions
      if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows) {
        s.gameOver = true;
        return;
      }

      if (s.body.some((seg, i) => i > 0 && seg.x === head.x && seg.y === head.y)) {
        s.gameOver = true;
        return;
      }

      s.body.unshift(head);

      // Check food
      if (head.x === s.food.x && head.y === s.food.y) {
        setScore(sc => sc + 1);
        // Spawn new food (avoid body)
        let newFood;
        do {
          newFood = {
            x: Math.floor(Math.random() * cols),
            y: Math.floor(Math.random() * rows)
          };
        } while (s.body.some(seg => seg.x === newFood.x && seg.y === newFood.y));
        s.food = newFood;
      } else {
        s.body.pop();
      }
    }

    function draw(ctx) {
      const s = state.current;
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--nf-bg');
      const fg = getComputedStyle(document.documentElement).getPropertyValue('--nf-fg');
      const border = getComputedStyle(document.documentElement).getPropertyValue('--nf-border');

      ctx.clearRect(0, 0, cols * size, rows * size);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cols * size, rows * size);
      ctx.strokeStyle = border;
      ctx.strokeRect(0.5, 0.5, cols * size - 1, rows * size - 1);

      // Food
      ctx.fillStyle = fg;
      ctx.fillRect(s.food.x * size + 4, s.food.y * size + 4, size - 8, size - 8);

      // Snake
      s.body.forEach((seg, i) => {
        ctx.strokeStyle = fg;
        ctx.strokeRect(seg.x * size + 2, seg.y * size + 2, size - 4, size - 4);
        if (i === 0) {
          ctx.fillStyle = fg;
          ctx.fillRect(seg.x * size + 5, seg.y * size + 5, size - 10, size - 10);
        }
      });

      // UI
      ctx.fillStyle = fg;
      ctx.font = '12px ui-monospace, monospace';
      ctx.fillText(`Score: ${score}${s.gameOver ? ' — GAME OVER (Esc)' : ' (Esc to close)'}`, 6, 14);
    }

    return () => cancelAnimationFrame(animId);
  }, [score]);

  const handleReset = () => {
    state.current = {
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      body: [{ x: 5, y: 8 }, { x: 4, y: 8 }],
      food: { x: 12, y: 8 },
      gameOver: false
    };
    setScore(0);
  };

  return (
    <div className="nf-modal" onClick={onClose}>
      <div className="nf-modal-body" onClick={(e) => e.stopPropagation()}>
        <div className="nf-modal-head">
          <strong>🐍 Snake</strong>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="nf-chip" onClick={handleReset}>🔄</button>
            <button className="nf-chip" onClick={onClose}>✖</button>
          </div>
        </div>
        <div style={{ display: 'grid', placeItems: 'center', padding: 8 }}>
          <canvas
            ref={cvs}
            width={cols * size}
            height={rows * size}
            style={{
              width: '100%',
              maxWidth: cols * size,
              height: 'auto',
              background: 'var(--nf-bg)',
              border: '1px solid var(--nf-border)',
              borderRadius: 8
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ============= Game Components (Simplified placeholders) =============
function CatchBookGame({ difficulty, assist, onScore }) {
  return <div className="nf-game-placeholder">📚 CatchBook (placeholder - implémentation complète dans le code original)</div>;
}

function BreakoutGame({ difficulty, assist, onScore }) {
  return <div className="nf-game-placeholder">🧱 Breakout (placeholder)</div>;
}

function PongGame({ difficulty, assist, onScore }) {
  return <div className="nf-game-placeholder">🏓 Pong (placeholder)</div>;
}

function FlappyGame({ difficulty, assist, onScore }) {
  return <div className="nf-game-placeholder">🐦 Flappy (placeholder)</div>;
}

// ============= Theme Variants =============
function getTitle(variant) {
  const titles = {
    github: '404 — Lost in the repo',
    netflix: '404 — Scene Not Found',
    terminal: '404 — command not found',
    stripe: '404 — Off the path',
    cloudflare: '404 — Signal lost',
    medium: '404 — Page not found',
    slack: '404 — Channel not found',
    discord: '404 — You seem to be lost',
    apple: '404 — This page cant be found',
    notion: '404 — Missing page',
    book: '404 — Page introuvable'
  };
  return titles[variant] || titles.book;
}

function getSubtitle(variant, path) {
  const pathSpan = <code className="nf-kbd">{path}</code>;
  
  const subtitles = {
    github: <span>We couldn't locate {pathSpan}. Try another branch or head back.</span>,
    netflix: <span>Oops, this scene is missing. You can go home or keep browsing.</span>,
    terminal: <span>Path {pathSpan} does not exist. Type <code className="nf-kbd">help</code> or press H.</span>,
    stripe: <span>A detour, not a dead end. Explore articles or return home.</span>,
    cloudflare: <span>Route unreachable: {pathSpan}. Please try again.</span>,
    medium: <span>The story you're looking for isn't here. Discover other reads.</span>,
    slack: <span>We can't find that channel ({pathSpan}). Try search or go back.</span>,
    discord: <span>The invite or path {pathSpan} is invalid or expired.</span>,
    apple: <span>The page you're looking for doesn't exist or has moved.</span>,
    notion: <span>This page doesn't exist. Check the workspace or explore other pages.</span>,
    book: <span>La page {pathSpan} est introuvable. Retournez en arrière ou explorez nos articles.</span>
  };
  
  return subtitles[variant] || subtitles.book;
}

function renderVariant(variant) {
  const variants = {
    github: <GithubSVG />,
    netflix: <NetflixTheme />,
    terminal: <TerminalTheme />,
    stripe: <StripeSVG />,
    cloudflare: <CloudflareSVG />,
    medium: <MediumTheme />,
    slack: <SlackTheme />,
    discord: <DiscordTheme />,
    apple: <AppleTheme />,
    notion: <NotionTheme />,
    book: <BookSVG />
  };
  
  return variants[variant] || variants.book;
}

// ============= SVG Components =============
function BookSVG() {
  return (
    <svg width="240" height="176" viewBox="0 0 200 160" role="img" aria-label="Personne triste">
      <line x1="20" y1="140" x2="180" y2="140" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="120" y="40" width="60" height="60" fill="none" stroke="currentColor" strokeWidth="2" rx="2" />
      <line x1="120" y1="70" x2="180" y2="70" stroke="currentColor" strokeWidth="2" />
      <rect x="126" y="46" width="8" height="18" fill="currentColor" />
      <rect x="138" y="46" width="8" height="18" fill="currentColor" />
      <rect x="150" y="46" width="8" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2">
        <animate attributeName="stroke-dashoffset" values="0;5;0" dur="2.4s" repeatCount="indefinite" />
      </rect>
      <rect x="162" y="46" width="8" height="18" fill="currentColor" />
      <g style={{ animation: 'breathe 4s ease-in-out infinite' }}>
        <circle cx="62" cy="60" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="58" cy="58" r="1.6" fill="currentColor">
          <animate attributeName="r" values="1.6;0.2;1.6" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="66" cy="58" r="1.6" fill="currentColor">
          <animate attributeName="r" values="1.6;0.2;1.6" dur="3s" repeatCount="indefinite" begin="0.5s" />
        </circle>
        <path d="M57 64 q5 4 10 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function GithubSVG() {
  return (
    <svg width="300" height="120" viewBox="0 0 300 120" role="img" aria-label="Repo not found">
      <defs><clipPath id="octo"><path d="M30,60 a30,30 0 1,0 60,0 a30,30 0 1,0 -60,0" /></clipPath></defs>
      <circle cx="60" cy="60" r="34" fill="none" stroke="currentColor" strokeWidth="2" />
      <g clipPath="url(#octo)"><rect x="26" y="56" width="68" height="20" fill="currentColor" /></g>
      <circle cx="50" cy="58" r="3" fill="var(--nf-bg)" />
      <circle cx="70" cy="58" r="3" fill="var(--nf-bg)" />
      <path d="M120 40 C160 40, 160 80, 200 80 S240 40, 280 40" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3">
        <animate attributeName="stroke-dashoffset" values="0;7;0" dur="3s" repeatCount="indefinite" />
      </path>
      <circle cx="200" cy="80" r="5" fill="currentColor" />
    </svg>
  );
}

function NetflixTheme() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', width: '100%', padding: 12, position: 'relative', overflow: 'hidden' }}>
      <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', lineHeight: 1 }}>
        <span style={{ display: 'inline-block', animation: 'glitch-1 1.8s infinite steps(2,end)' }}>404</span>
      </div>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(0,0,0,.08) 1px, transparent 1px)',
        backgroundSize: '100% 4px',
        mixBlendMode: 'multiply',
        animation: 'scanline 6s linear infinite'
      }} />
    </div>
  );
}

function TerminalTheme() {
  return (
    <div style={{
      width: '100%',
      maxWidth: 640,
      border: '1px solid var(--nf-fg)',
      borderRadius: 8,
      padding: 12,
      background: 'var(--nf-bg)',
      fontFamily: 'ui-monospace, monospace',
      fontSize: 12
    }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--nf-fg)', display: 'inline-block' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#777', display: 'inline-block' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#bbb', display: 'inline-block' }} />
      </div>
      <div>
        <div>$ cd /unknown</div>
        <div>$ ls</div>
        <div>README.md articles/ users/ <span style={{ opacity: 0.5 }}>…</span></div>
        <div>$ cat 404.txt</div>
        <div>→ route not found</div>
        <div>$ _<span style={{ animation: 'blink 1s steps(2,end) infinite' }}>|</span></div>
      </div>
    </div>
  );
}

function StripeSVG() {
  return (
    <svg width="640" height="140" viewBox="0 0 640 140" role="img" aria-label="Flow lines" style={{ display: 'block', maxWidth: '100%' }}>
      <path d="M0,40 C80,10 160,70 240,40 320,10 400,70 480,40 560,10 640,70 640,40"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <animate attributeName="stroke-dasharray" values="0,2000;200,2000;0,2000" dur="6s" repeatCount="indefinite" />
      </path>
      <path d="M0,90 C80,60 160,120 240,90 320,60 400,120 480,90 560,60 640,120 640,90"
        fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6">
        <animate attributeName="stroke-dashoffset" values="0;120;0" dur="7s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function CloudflareSVG() {
  return (
    <svg width="300" height="160" viewBox="0 0 300 160" role="img" aria-label="Signal lost">
      <circle cx="60" cy="80" r="26" fill="none" stroke="currentColor" strokeWidth="2" />
      {[0, 30, 60, 90, 120, 150].map((a) => (
        <line
          key={a}
          x1="60"
          y1="80"
          x2={60 + 40 * Math.cos((a * Math.PI) / 180)}
          y2={80 + 40 * Math.sin((a * Math.PI) / 180)}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
      <path d="M140,90 q20 -20 40 0 t40 0 t40 0" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4">
        <animate attributeName="stroke-dashoffset" values="0;18;0" dur="4s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function MediumTheme() {
  return (
    <div style={{ textAlign: 'center', padding: '8px 12px' }}>
      <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: '-1px' }}>404</div>
      <blockquote style={{ marginTop: 8, fontStyle: 'italic', opacity: 0.8 }}>
        "Sometimes the missing page is just the beginning of a better story."
      </blockquote>
    </div>
  );
}

function SlackTheme() {
  return (
    <div style={{ padding: 16, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          border: '2px solid currentColor',
          display: 'grid',
          placeItems: 'center',
          fontSize: 14,
          fontWeight: 800
        }}>S</div>
        <div className="mono" style={{ opacity: 0.8 }}>#routing</div>
      </div>
      <div style={{ border: '1px solid var(--nf-border)', borderRadius: 10, padding: 10 }}>
        <div style={{ opacity: 0.6, marginBottom: 6 }} className="mono">Today</div>
        <div>Hmm, we can't find this channel.</div>
      </div>
    </div>
  );
}

function DiscordTheme() {
  return (
    <div style={{ padding: 16, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'currentColor', opacity: 0.8 }} />
        <div className="mono" style={{ opacity: 0.8 }}>lost-realm</div>
      </div>
      <div style={{ border: '1px solid var(--nf-border)', borderRadius: 10, padding: 12 }}>
        <div style={{ opacity: 0.7 }}>You seem to be lost. Check your invite or return home.</div>
      </div>
    </div>
  );
}

function AppleTheme() {
  return (
    <div style={{ textAlign: 'center', padding: 16 }}>
      <div style={{ fontSize: 64, fontWeight: 600, letterSpacing: '-1px' }}>404</div>
      <div style={{ marginTop: 6, opacity: 0.7 }}>This page can't be found.</div>
      <div style={{ marginTop: 10, height: 1, background: 'var(--nf-border)' }} />
    </div>
  );
}

function NotionTheme() {
  return (
    <div style={{ padding: 16, width: '100%' }}>
      <div style={{ border: '1px solid var(--nf-border)', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 28,
            height: 28,
            border: '1px solid var(--nf-fg)',
            borderRadius: 6,
            fontWeight: 800,
            display: 'grid',
            placeItems: 'center'
          }}>N</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Missing page</div>
        </div>
        <div style={{ opacity: 0.75 }}>The page you're looking for doesn't exist or is restricted.</div>
      </div>
    </div>
  );
}

// ============= Styles =============
function BASE_STYLES(prefersReduced) {
  const animState = prefersReduced ? 'paused' : 'running';
  
  return `
:root {
  --nf-bg: #fff;
  --nf-fg: #111;
  --nf-sub: rgba(0,0,0,.7);
  --nf-border: #ccc;
}

:root[data-nf-dark="1"] {
  --nf-bg: #0b0b0b;
  --nf-fg: #f2f2f2;
  --nf-sub: rgba(255,255,255,.7);
  --nf-border: #2a2a2a;
}

@keyframes wiggle {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(6deg); }
  75% { transform: rotate(-6deg); }
}

@keyframes breathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}

@keyframes glitch-1 {
  0% { transform: none; }
  33% { transform: translateX(1px); }
  66% { transform: translateX(-1px); }
  100% { transform: none; }
}

@keyframes blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

@keyframes scanline {
  0% { background-position: 0 0; }
  100% { background-position: 0 4px; }
}

* {
  box-sizing: border-box;
}

.nf-card {
  border: 1px dashed var(--nf-border);
  border-radius: 10px;
  padding: 12px;
  background: var(--nf-bg);
}

.nf-muted {
  color: var(--nf-sub);
}

.nf-hint {
  color: rgba(127,127,127,.8);
  margin-left: 8px;
  font-size: 11px;
}

.nf-kbd {
  margin: 0 0.4rem;
  border-radius: 4px;
  background: rgba(127,127,127,.15);
  padding: 0.15rem 0.35rem;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 12px;
  color: var(--nf-fg);
  border: 1px solid var(--nf-border);
}

.nf-btn {
  border: 1px solid var(--nf-border);
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 500;
  background: transparent;
  color: var(--nf-fg);
  cursor: pointer;
  transition: all 0.2s;
}

.nf-btn:hover {
  background: var(--nf-fg);
  color: var(--nf-bg);
}

.nf-btn:focus {
  outline: 2px solid var(--nf-fg);
  outline-offset: 2px;
}

.nf-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
  align-items: center;
}

.center {
  text-align: center;
}

.mono {
  font-family: ui-monospace, Menlo, Consolas, monospace;
}

.nf-themebar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.nf-chip {
  border: 1px solid var(--nf-border);
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--nf-bg);
  font-size: 12px;
  color: var(--nf-fg);
  cursor: pointer;
  transition: all 0.2s;
}

.nf-chip:hover {
  background: rgba(127,127,127,.1);
}

.nf-chip.is-active {
  background: var(--nf-fg);
  color: var(--nf-bg);
  border-color: var(--nf-fg);
}

.nf-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 8px;
}

.nf-left, .nf-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.nf-breadcrumb {
  opacity: 0.8;
  font-size: 14px;
}

.nf-badge {
  background: var(--nf-fg);
  color: var(--nf-bg);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.nf-banner {
  background: rgba(255, 200, 0, 0.15);
  border: 1px solid rgba(255, 200, 0, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
}

.nf-link {
  color: var(--nf-fg);
  text-decoration: underline;
  font-weight: 600;
}

.nf-link:hover {
  opacity: 0.7;
}

.nf-modal {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0,0,0,.6);
  z-index: 999;
  backdrop-filter: blur(4px);
}

.nf-modal-body {
  background: var(--nf-bg);
  color: var(--nf-fg);
  border: 1px solid var(--nf-border);
  border-radius: 12px;
  width: min(92vw, 720px);
  max-height: 85vh;
  overflow-y: auto;
  padding: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,.3);
}

.nf-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px dashed var(--nf-border);
  padding-bottom: 8px;
  margin-bottom: 12px;
}

.nf-leaderboard {
  background: rgba(127,127,127,.05);
  border: 1px solid var(--nf-border);
  border-radius: 8px;
  padding: 12px;
}

.nf-game-placeholder {
  background: rgba(127,127,127,.05);
  border: 1px dashed var(--nf-border);
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  font-size: 14px;
  color: var(--nf-sub);
}

svg, [style*="animation"] {
  animation-play-state: ${animState};
}

@media (min-width: 640px) {
  .nf-row {
    flex-direction: row;
  }
}

@media (max-width: 640px) {
  .nf-topbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .nf-left, .nf-right {
    justify-content: center;
  }
}
`;
}