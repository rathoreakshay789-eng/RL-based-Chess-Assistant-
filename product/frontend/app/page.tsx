"use client";

import { useEffect, useMemo, useState } from "react";
import { Chess, Square } from "chess.js";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
let USER = "default_user";
let TOKEN = "";

type Tab = "play" | "analysis" | "puzzles" | "coach" | "rules" | "profile";
type Side = "white" | "black";

const glyph: Record<string, string> = {
  wK:"♔",wQ:"♕",wR:"♖",wB:"♗",wN:"♘",wP:"♙",
  bK:"♚",bQ:"♛",bR:"♜",bB:"♝",bN:"♞",bP:"♟"
};

async function api(path: string, options?: RequestInit) {
  const headers: any = {
    ...(options?.headers as any),
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {})
  };

  const r = await fetch(`${API}${path}`, {
    ...options,
    headers
  });

  const data = await r.json().catch(() => ({}));

  if (r.status === 401 && TOKEN) {
    try {
      localStorage.removeItem("chessrl_auth");
    } catch {}
    location.reload();
  }

  if (!r.ok) {
    throw new Error(data.detail || "Request failed");
  }

  return data;
}

function Card({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}

let _ac: AudioContext | null = null;

function playSound(kind: "move" | "capture" | "check" | "end") {
  try {
    const AC =
      (window as any).AudioContext ||
      (window as any).webkitAudioContext;

    if (!AC) return;

    _ac = _ac || new AC();

    const ac = _ac as AudioContext;

    if (ac.state === "suspended") {
      ac.resume();
    }

    const t = ac.currentTime;

    const tap = (
      st: number,
      freq: number,
      vol: number,
      dur: number
    ) => {
      const n = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, n, ac.sampleRate);
      const d = buf.getChannelData(0);

      for (let i = 0; i < n; i++) {
        d[i] =
          (Math.random() * 2 - 1) *
          Math.pow(1 - i / n, 3);
      }

      const src = ac.createBufferSource();
      const bp = ac.createBiquadFilter();
      const g = ac.createGain();

      src.buffer = buf;
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = 1.4;
      g.gain.value = vol;

      src.connect(bp);
      bp.connect(g);
      g.connect(ac.destination);
      src.start(t + st);

      const o = ac.createOscillator();
      const og = ac.createGain();

      o.type = "sine";
      o.frequency.setValueAtTime(freq / 8, t + st);
      o.frequency.exponentialRampToValueAtTime(
        freq / 16,
        t + st + 0.08
      );

      og.gain.setValueAtTime(vol * 0.5, t + st);
      og.gain.exponentialRampToValueAtTime(
        0.0001,
        t + st + 0.09
      );

      o.connect(og);
      og.connect(ac.destination);

      o.start(t + st);
      o.stop(t + st + 0.1);
    };

    const bell = (
      st: number,
      f: number,
      d: number,
      v: number
    ) => {
      [1, 2.01, 3.02].forEach((m, i) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        const vv = v / (i + 1) / 1.5;

        o.type = "sine";
        o.frequency.value = f * m;

        g.gain.setValueAtTime(0.0001, t + st);

        g.gain.exponentialRampToValueAtTime(
          vv,
          t + st + 0.01
        );

        g.gain.exponentialRampToValueAtTime(
          0.0001,
          t + st + d
        );

        o.connect(g);
        g.connect(ac.destination);

        o.start(t + st);
        o.stop(t + st + d);
      });
    };

    if (kind === "move") {
      tap(0, 1800, 1.0, 0.05);
    } else if (kind === "capture") {
      tap(0, 1300, 1.6, 0.07);
      tap(0.055, 1700, 1.0, 0.05);
    } else if (kind === "check") {
      bell(0, 784, 0.5, 0.18);
      bell(0.12, 1047, 0.7, 0.18);
    } else {
      bell(0, 659, 0.8, 0.2);
      bell(0.18, 523, 0.8, 0.2);
      bell(0.36, 392, 1.2, 0.22);
    }
  } catch {}
}

function soundOf(m: any, g: Chess) {
  playSound(
    g.isGameOver()
      ? "end"
      : g.inCheck()
      ? "check"
      : m?.captured
      ? "capture"
      : "move"
  );
}

function evalOf(
  fen: string
): { pct: number; label: string } {
  const g = new Chess(fen);

  if (g.isCheckmate()) {
    return g.turn() === "w"
      ? { pct: 0, label: "0-1" }
      : { pct: 100, label: "1-0" };
  }

  const v: Record<string, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0
  };

  let d = 0;

  for (const row of g.board()) {
    for (const p of row) {
      if (p) {
        d +=
          (p.color === "w" ? 1 : -1) *
          v[p.type];
      }
    }
  }

  return {
    pct: 100 / (1 + Math.exp(-d / 3.5)),
    label: (d > 0 ? "+" : "") + d.toFixed(1)
  };
}

function Board({
  fen,
  side,
  onMove,
  disabled = false
}: {
  fen: string;
  side: Side;
  onMove: (move: string) => void;
  disabled?: boolean;
}) {
  const game = useMemo(
    () => new Chess(fen),
    [fen]
  );

  const [selected, setSelected] =
    useState<Square | null>(null);

  const [legal, setLegal] =
    useState<Square[]>([]);

  const files =
    side === "white"
      ? ["a","b","c","d","e","f","g","h"]
      : ["h","g","f","e","d","c","b","a"];

  const ranks =
    side === "white"
      ? ["8","7","6","5","4","3","2","1"]
      : ["1","2","3","4","5","6","7","8"];

  const checkSq = game.inCheck()
    ? game
        .board()
        .flat()
        .find(
          p =>
            p &&
            p.type === "k" &&
            p.color === game.turn()
        )?.square
    : undefined;

  const click = (sq: Square) => {
    if (disabled || game.isGameOver()) return;

    if (selected && legal.includes(sq)) {
      const probe = new Chess(fen);

      try {
        const move = probe.move({
          from: selected,
          to: sq,
          promotion: "q"
        });

        soundOf(move, probe);

        onMove(
          move.from +
          move.to +
          (move.promotion || "")
        );
      } catch {}

      setSelected(null);
      setLegal([]);

      return;
    }

    const p = game.get(sq);

    if (
      !p ||
      (
        game.turn() === "w"
          ? p.color !== "w"
          : p.color !== "b"
      )
    ) {
      setSelected(null);
      setLegal([]);
      return;
    }

    setSelected(sq);

    setLegal(
      game
        .moves({
          square: sq,
          verbose: true
        })
        .map(m => m.to as Square)
    );
  };

  return (
    <div className="board-wrap">
      <div className="board">
        {ranks.flatMap((rank, ri) =>
          files.map((file, fi) => {
            const sq =
              `${file}${rank}` as Square;

            const p = game.get(sq);

            const dark =
              (ri + fi) % 2 === 1;

            const isSelected =
              selected === sq;

            const isLegal =
              legal.includes(sq);

            return (
              <button
                key={sq}
                onClick={() => click(sq)}
                className={`square ${
                  dark ? "dark" : "light"
                } ${
                  isSelected ? "selected" : ""
                } ${
                  checkSq === sq ? "check" : ""
                }`}
              >
                {p && (
                  <span
                    className={`piece ${
                      p.color === "w"
                        ? "white-piece"
                        : "black-piece"
                    }`}
                  >
                    {
                      glyph[
                        `${p.color}${p.type.toUpperCase()}`
                      ]
                    }
                  </span>
                )}

                {isLegal && (
                  <span
                    className={
                      p
                        ? "capture-dot capture"
                        : "capture-dot"
                    }
                  />
                )}

                {fi === 0 && (
                  <span className="coord rank">
                    {rank}
                  </span>
                )}

                {ri === 7 && (
                  <span className="coord file">
                    {file}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
function GameReplay({
  game,
  onClose
}: {
  game: any;
  onClose: () => void;
}) {
  const parsed = useMemo(() => {
    try {
      const loaded = new Chess();

      loaded.loadPgn(game.pgn);

      const history = loaded.history({
        verbose: true
      });

      if (history.length === 0) {
        return {
          moves: [],
          positions: [new Chess().fen()]
        };
      }

      // Position before every move.
      const positions = history.map(
        (m: any) => m.before
      );

      // Add final position.
      const last =
        history[history.length - 1];

      const finalBoard = new Chess(
        last.before
      );

      finalBoard.move(last.san);

      positions.push(
        finalBoard.fen()
      );

      return {
        moves: history,
        positions
      };
    } catch (e) {
      return {
        moves: [],
        positions: [new Chess().fen()],
        error:
          e instanceof Error
            ? e.message
            : "Could not load this game"
      };
    }
  }, [game.pgn]);

  const [moveIndex, setMoveIndex] =
    useState(0);

  useEffect(() => {
    setMoveIndex(0);
  }, [game.id]);

  const moves = parsed.moves;

  const position =
    parsed.positions[moveIndex] ||
    new Chess().fen();

  const currentMove =
    moveIndex > 0
      ? moves[moveIndex - 1]
      : null;

  return (
    <Card className="wide replay-card">
      <div className="section-head">
        <div>
          <span className="eyebrow">
            GAME REPLAY · GAME #{game.id}
          </span>

          <h2>
            {game.result || "Saved game"}
          </h2>

          <p>
            {new Date(
              game.played_at
            ).toLocaleString()}{" "}
            · {game.difficulty || "—"} ·{" "}
            {moves.length} moves
          </p>
        </div>

        <button
          className="ghost-btn"
          onClick={onClose}
        >
          Close replay
        </button>
      </div>

      {parsed.error ? (
        <div className="empty big">
          {parsed.error}
        </div>
      ) : (
        <div className="replay-layout">
          {/* BOARD + CONTROLS */}
          <div>
            <Board
              fen={position}
              side="white"
              onMove={() => {}}
              disabled
            />

            <div className="replay-controls">
              <button
                onClick={() =>
                  setMoveIndex(0)
                }
                disabled={moveIndex === 0}
              >
                ⏮
              </button>

              <button
                onClick={() =>
                  setMoveIndex(i =>
                    Math.max(0, i - 1)
                  )
                }
                disabled={moveIndex === 0}
              >
                ◀
              </button>

              <span>
                {moveIndex === 0
                  ? "Starting position"
                  : `${Math.ceil(
                      moveIndex / 2
                    )}${
                      moveIndex % 2 === 1
                        ? "."
                        : "..."
                    } ${
                      currentMove?.san ||
                      ""
                    }`}
              </span>

              <button
                onClick={() =>
                  setMoveIndex(i =>
                    Math.min(
                      moves.length,
                      i + 1
                    )
                  )
                }
                disabled={
                  moveIndex ===
                  moves.length
                }
              >
                ▶
              </button>

              <button
                onClick={() =>
                  setMoveIndex(
                    moves.length
                  )
                }
                disabled={
                  moveIndex ===
                  moves.length
                }
              >
                ⏭
              </button>
            </div>
          </div>

          {/* GAME INFORMATION + MOVES */}
          <div className="replay-moves">
            <div className="replay-players">
              <div>
                <span>WHITE</span>

                <b>
                  {game.side === "white"
                    ? USER
                    : "ChessRL AI"}
                </b>
              </div>

              <div>
                <span>BLACK</span>

                <b>
                  {game.side === "black"
                    ? USER
                    : "ChessRL AI"}
                </b>
              </div>
            </div>

            <div className="replay-move-list">
              {moves.map(
                (
                  m: any,
                  i: number
                ) => {
                  const number =
                    Math.floor(i / 2) + 1;

                  const active =
                    moveIndex === i + 1;

                  return (
                    <button
                      key={i}
                      className={
                        active
                          ? "replay-move active"
                          : "replay-move"
                      }
                      onClick={() =>
                        setMoveIndex(
                          i + 1
                        )
                      }
                    >
                      <span>
                        {i % 2 === 0
                          ? `${number}.`
                          : `${number}...`}
                      </span>

                      <b>
                        {m.san}
                      </b>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
function Login({
  onAuth
}: {
  onAuth: (u: string, t: string) => void;
}) {
  const [mode, setMode] =
    useState<"login" | "register">("login");

  const [u, setU] = useState("");
  const [pw, setPw] = useState("");

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr("");

    try {
      const d = await api(
        `/auth/${mode}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            username: u,
            password: pw
          })
        }
      );

      onAuth(d.username, d.token);
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : "Something went wrong"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="brand-mark">♞</div>

        <h1>
          Chess<span>RL</span>
        </h1>

        <p>
          {mode === "login"
            ? "Sign in to continue"
            : "Create your account"}
        </p>

        <input
          placeholder="Username"
          value={u}
          onChange={e => setU(e.target.value)}
          autoComplete="username"
        />

        <input
          type="password"
          placeholder="Password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") submit();
          }}
          autoComplete={
            mode === "login"
              ? "current-password"
              : "new-password"
          }
        />

        {err && (
          <div className="login-err">
            {err}
          </div>
        )}

        <button
          className="gold-btn"
          onClick={submit}
          disabled={busy || !u || !pw}
        >
          {busy
            ? "Please wait…"
            : mode === "login"
            ? "Sign in"
            : "Create account"}
        </button>

        <button
          className="link-btn"
          onClick={() => {
            setMode(
              mode === "login"
                ? "register"
                : "login"
            );
            setErr("");
          }}
        >
          {mode === "login"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>

        <small>
          The first request can take up to a minute
          while the server wakes up.
        </small>
      </div>
    </main>
  );
}

export default function Home() {
  const [auth, setAuth] =
    useState<{
      user: string;
      token: string;
    } | null>(null);

  const [ready, setReady] =
    useState(false);

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem("chessrl_auth");

      if (raw) {
        const a = JSON.parse(raw);

        TOKEN = a.token;
        USER = a.user;

        setAuth(a);
      }
    } catch {}

    setReady(true);
  }, []);

  const onAuth = (
    user: string,
    token: string
  ) => {
    TOKEN = token;
    USER = user;

    const a = {
      user,
      token
    };

    try {
      localStorage.setItem(
        "chessrl_auth",
        JSON.stringify(a)
      );
    } catch {}

    setAuth(a);
  };

  const logout = () => {
    TOKEN = "";
    USER = "default_user";

    try {
      localStorage.removeItem(
        "chessrl_auth"
      );
    } catch {}

    setAuth(null);
  };

  if (!ready) return null;

  if (!auth) {
    return <Login onAuth={onAuth} />;
  }

  return (
    <App
      key={auth.user}
      user={auth.user}
      onLogout={logout}
    />
  );
}

function App({
  user,
  onLogout
}: {
  user: string;
  onLogout: () => void;
}) {
  USER = user;

  const [tab, setTab] =
    useState<Tab>("play");

  const [fen, setFen] =
    useState(new Chess().fen());

  const [side, setSide] =
    useState<Side>("white");

  const [difficulty, setDifficulty] =
    useState("medium");

  const [engineType, setEngineType] =
    useState("custom");

  const [thinking, setThinking] =
    useState(false);

  const [playHistory, setPlayHistory] =
    useState<any[]>([]);

  const [playError, setPlayError] =
    useState("");

  const [analysis, setAnalysis] =
    useState<any>(null);

  const [analysisId, setAnalysisId] =
    useState<number | null>(null);

  const [profile, setProfile] =
    useState<any>(null);

  const [games, setGames] =
    useState<any[]>([]);
  const [selectedGame, setSelectedGame] =
  useState<any | null>(null);

  const [puzzles, setPuzzles] =
    useState<any[]>([]);

  const [puzzleIndex, setPuzzleIndex] =
    useState(0);

  const [chat, setChat] =
    useState<any[]>([]);

  const [question, setQuestion] =
    useState("");

  const [rules, setRules] =
    useState<any[]>([]);

  const [ruleQuery, setRuleQuery] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const start = (
    newSide: Side = side
  ) => {
    setFen(new Chess().fen());
    setSide(newSide);
    setPlayHistory([]);
    setPlayError("");
    setMessage("");
  };

  const playMove = async (
    move: string
  ) => {
    const prevFen = fen;

    setThinking(true);
    setPlayError("");

    try {
      const g = new Chess(prevFen);

      g.move({
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        promotion: move[4]
      });

      setFen(g.fen());
    } catch {}

    try {
      const callEngine = () =>
        api("/engine_move", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fen: prevFen,
            move,
            difficulty,
            engine_type: engineType
          })
        });

      let data;

      try {
        data = await callEngine();
      } catch {
        await new Promise(r =>
          setTimeout(r, 3000)
        );

        data = await callEngine();
      }

      if (!data.success) {
        setFen(prevFen);
        setPlayError(
          data.message || "Illegal move"
        );
        return;
      }

      if (data.engine_move) {
        try {
          const g = new Chess(prevFen);

          g.move({
            from: move.slice(0, 2),
            to: move.slice(2, 4),
            promotion: move[4]
          });

          const em = String(
            data.engine_move
          );

          const m =
            em.length >= 4 &&
            !/[^a-h1-8qrbn]/.test(em)
              ? g.move({
                  from: em.slice(0, 2),
                  to: em.slice(2, 4),
                  promotion: em[4]
                })
              : g.move(em);

          soundOf(m, g);
        } catch {}
      }

      setFen(data.fen);

      const updatedHistory = [
        ...playHistory,
        {
          user_move: move,
          engine_move: data.engine_move
        }
      ];

      setPlayHistory(
        updatedHistory
      );

      if (data.game_over) {
        setMessage(
          `Game over — ${data.result}`
        );

        await saveGame(
          updatedHistory,
          data.result
        );
      }
    } catch (e) {
      setFen(prevFen);

      setPlayError(
        e instanceof Error
          ? e.message
          : "Engine unavailable"
      );
    } finally {
      setThinking(false);
    }
  };

  const loadGames = async () => {
    try {
      const d = await api("/games");

      setGames(d.games || []);
    } catch {}
  };

  /*
   * Saves a completed engine game.
   *
   * Important changes:
   * 1. The complete current move history is passed in.
   * 2. The POST is awaited.
   * 3. The backend's returned game_id is used only as confirmation.
   * 4. Game history is refreshed AFTER the save succeeds.
   * 5. No polling/rating loop is used.
   */
  const saveGame = async (
    hist: any[],
    result: string
  ) => {
    try {
      const g = new Chess();

      let n = 0;

      for (const h of hist) {
        for (const m of [
          h.user_move,
          h.engine_move
        ]) {
          if (!m) continue;

          const x = String(m);

          if (
            /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(
              x
            )
          ) {
            g.move({
              from: x.slice(0, 2),
              to: x.slice(2, 4),
              promotion: x[4] as any
            });
          } else {
            g.move(x);
          }

          n++;
        }
      }

      g.setHeader(
        "Event",
        "ChessRL game"
      );

      g.setHeader(
        "White",
        side === "white"
          ? USER
          : "ChessRL engine"
      );

      g.setHeader(
        "Black",
        side === "black"
          ? USER
          : "ChessRL engine"
      );

      const saved = await api(
        "/games",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            pgn: g.pgn(),
            result: String(result || ""),
            difficulty,
            engine_type: engineType,
            side,
            num_moves: n
          })
        }
      );

      /*
       * The backend now returns:
       * {
       *   saved: true,
       *   game_id: <id>
       * }
       *
       * The POST itself confirms the game was
       * inserted, so there is no need to poll.
       */
      await loadGames();
      await loadProfile();

      const gameId =
        saved?.game_id;

      setMessage(
        gameId != null
          ? `Game saved successfully · Game #${gameId} · ${result}`
          : `Game saved successfully · ${result}`
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? `Game save failed: ${e.message}`
          : "Game save failed"
      );
    }
  };

  const loadProfile = async () => {
    try {
      setProfile(
        await api(`/profile/${USER}`)
      );
    } catch {}
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const uploadPGN = async (
    file: File
  ) => {
    setLoading(true);
    setMessage("");

    try {
      const pgn =
        await file.text();

      const data = await api(
        "/upload_pgn",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            pgn,
            user_id: USER,
            personality:
              "encouraging"
          })
        }
      );

      setAnalysis(data.analysis);
      setAnalysisId(
        data.game_id
      );

      setProfile(
        data.player_profile
      );

      setMessage(
        data.chatbot_opening ||
          "Game analyzed."
      );

      setTab("analysis");
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Analysis failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPuzzles = async () => {
    setLoading(true);

    try {
      const data = await api(
        `/puzzles/${USER}?n=8`
      );

      setPuzzles(
        data.puzzles || []
      );

      setPuzzleIndex(0);
      setTab("puzzles");
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Puzzle loading failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const ask = async () => {
    if (!question.trim()) return;

    const q =
      question.trim();

    setQuestion("");

    setChat(c => [
      ...c,
      {
        role: "user",
        content: q
      }
    ]);

    try {
      const contextSource =
        analysisId
          ? "pgn_analysis"
          : "play_engine";

      const data = await api(
        "/chat",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            question: q,
            user_id: USER,
            game_id: analysisId,
            context_source:
              contextSource,

            play_context:
              contextSource ===
              "play_engine"
                ? {
                    source:
                      "play_engine",
                    difficulty,
                    moves:
                      playHistory,
                    current_fen:
                      fen,
                    game_over:
                      new Chess(
                        fen
                      ).isGameOver(),
                    result: (() => {
                      const c =
                        new Chess(
                          fen
                        );

                      return c.isCheckmate()
                        ? c.turn() === "w"
                          ? "0-1"
                          : "1-0"
                        : c.isGameOver()
                        ? "1/2-1/2"
                        : null;
                    })()
                  }
                : null,

            history: [
              ...chat,
              {
                role: "user",
                content: q
              }
            ],

            personality:
              "encouraging"
          })
        }
      );

      setChat(c => [
        ...c,
        {
          role: "assistant",
          content:
            data.response
        }
      ]);
    } catch (e) {
      setChat(c => [
        ...c,
        {
          role: "assistant",
          content:
            e instanceof Error
              ? e.message
              : "Coach unavailable"
        }
      ]);
    }
  };

  const loadRules = async (
    q = ruleQuery
  ) => {
    try {
      const data = q
        ? await api(
            `/rulebook/search?q=${encodeURIComponent(
              q
            )}`
          )
        : await api(
            "/rulebook"
          );

      setRules(
        data.results ||
          data.entries ||
          []
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Rulebook unavailable"
      );
    }
  };

  return (
    <main>
      <header className="topbar">
        <div
          className="brand"
          onClick={() =>
            setTab("play")
          }
        >
          <div className="brand-mark">
            ♞
          </div>

          <div>
            <strong>
              CHESS<span>RL</span>
            </strong>

            <small>
              AI CHESS COACH
            </small>
          </div>
        </div>

        <nav>
          {(
            [
              "play",
              "analysis",
              "puzzles",
              "coach",
              "rules",
              "profile"
            ] as Tab[]
          ).map(x => (
            <button
              key={x}
              className={
                tab === x
                  ? "nav-active"
                  : ""
              }
              onClick={() => {
                setTab(x);

                if (
                  x === "puzzles"
                ) {
                  loadPuzzles();
                }

                if (
                  x === "rules"
                ) {
                  loadRules("");
                }

                if (
                  x === "profile"
                ) {
                  loadProfile();
                  loadGames();
                }
              }}
            >
              {x}
            </button>
          ))}
        </nav>

        <div className="online">
          <i />
          {user.toUpperCase()}

          <button
            className="logout"
            onClick={onLogout}
          >
            LOG OUT
          </button>
        </div>
      </header>

      <section className="hero">
        <div>
          <div className="eyebrow">
            REINFORCEMENT LEARNING •
            CHESS ANALYTICS
          </div>

          <h1>
            Play sharper.
            <br />
            <em>Learn faster.</em>
          </h1>

          <p>
            Your chess engine,
            analysis lab, tactical
            trainer and AI coach —
            in one focused workspace.
          </p>
        </div>

        <div className="hero-stat">
          <b>
            {profile?.est_elo ||
              "—"}
          </b>

          <span>
            EST. ELO
          </span>
        </div>
      </section>

      {message && (
        <div className="toast">
          {message}
        </div>
      )}

      {tab === "play" && (
        <section className="workspace">
          <div className="play-main">
            <div className="section-head">
              <div>
                <span className="eyebrow">
                  LIVE GAME
                </span>

                <h2>
                  You vs ChessRL
                </h2>
              </div>

              <div className="controls">
                <select
                  value={difficulty}
                  onChange={e =>
                    setDifficulty(
                      e.target.value
                    )
                  }
                >
                  <option>
                    easy
                  </option>

                  <option>
                    medium
                  </option>

                  <option>
                    hard
                  </option>
                </select>

                <select
                  value={engineType}
                  onChange={e =>
                    setEngineType(
                      e.target.value
                    )
                  }
                >
                  <option value="custom">
                    RL Engine
                  </option>

                  <option value="stockfish">
                    Search Engine
                  </option>
                </select>

                <button
                  className="gold-btn"
                  onClick={() =>
                    start(side)
                  }
                >
                  New game
                </button>
              </div>
            </div>

            <div className="game-grid">
              {(() => {
                const ev =
                  evalOf(fen);

                return (
                  <div
                    className="eval-rail"
                    title={`Material: ${ev.label}`}
                    style={{
                      justifyContent:
                        side === "white"
                          ? "flex-end"
                          : "flex-start"
                    }}
                  >
                    <div
                      className="eval-fill"
                      style={{
                        height: `${ev.pct}%`
                      }}
                    />
                  </div>
                );
              })()}

              <Board
                fen={fen}
                side={side}
                onMove={playMove}
                disabled={
                  thinking
                }
              />

              <Card className="game-panel">
                <div className="opponent">
                  <div className="avatar">
                    ♞
                  </div>

                  <div>
                    <b>
                      ChessRL AI
                    </b>

                    <small>
                      {thinking
                        ? "Thinking…"
                        : difficulty.toUpperCase()}
                    </small>
                  </div>

                  <span className="dot" />
                </div>

                <div className="move-list">
                  {playHistory.length ===
                  0 ? (
                    <div className="empty">
                      Make your first move.
                    </div>
                  ) : (
                    playHistory.map(
                      (m, i) => (
                        <div key={i}>
                          <span>
                            {i + 1}.
                          </span>

                          <b>
                            {m.user_move}
                          </b>

                          <b>
                            {m.engine_move ||
                              "—"}
                          </b>
                        </div>
                      )
                    )
                  )}
                </div>

                <div className="panel-actions">
                  <button
                    onClick={() =>
                      setSide(
                        side ===
                        "white"
                          ? "black"
                          : "white"
                      )
                    }
                  >
                    Flip board
                  </button>

                  <button
                    onClick={() =>
                      start(side)
                    }
                  >
                    Reset
                  </button>
                </div>
              </Card>
            </div>
          </div>
        </section>
      )}

      {tab === "analysis" && (
        <section className="content-grid">
          <Card className="wide">
            <div className="section-head">
              <div>
                <span className="eyebrow">
                  ANALYSIS LAB
                </span>

                <h2>
                  Understand your game
                </h2>
              </div>

              <label className="upload">
                Upload PGN

                <input
                  type="file"
                  accept=".pgn,.txt"
                  onChange={e =>
                    e.target.files?.[0] &&
                    uploadPGN(
                      e.target.files[0]
                    )
                  }
                />
              </label>
            </div>

            {!analysis ? (
              <div className="empty big">
                {loading
                  ? "Analyzing your game…"
                  : "Upload a PGN to get move-by-move analysis, weaknesses and coaching."}
              </div>
            ) : (
              <div className="analysis-body">
                <div className="metric-row">
                  {[
                    [
                      "Blunders",
                      analysis.summary
                        ?.blunders ??
                        "—"
                    ],
                    [
                      "Mistakes",
                      analysis.summary
                        ?.mistakes ??
                        "—"
                    ],
                    [
                      "Inaccuracies",
                      analysis.summary
                        ?.inaccuracies ??
                        "—"
                    ],
                    [
                      "Avg CP loss",
                      analysis.summary
                        ?.avg_cp_loss ??
                        "—"
                    ],
                    [
                      "Weakness",
                      analysis.summary
                        ?.primary_weakness ??
                        "—"
                    ]
                  ].map(x => (
                    <div
                      className="metric"
                      key={x[0]}
                    >
                      <span>
                        {x[0]}
                      </span>

                      <b>
                        {String(x[1])}
                      </b>
                    </div>
                  ))}
                </div>

                <div className="moves-table">
                  {(analysis.moves ||
                    []).map(
                    (
                      m: any,
                      i: number
                    ) => (
                      <div
                        className="analysis-row"
                        key={i}
                      >
                        <span>
                          {m.move_number ??
                            i + 1}
                        </span>

                        <b>
                          {m.move}
                        </b>

                        <span>
                          {
                            m.classification
                          }
                        </span>

                        <span>
                          {m.mistake_type ||
                            "—"}
                        </span>

                        <span>
                          {m.cp_loss ??
                            0}{" "}
                          cp
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </Card>
        </section>
      )}

      {tab === "puzzles" && (
        <section className="content-grid">
          <Card className="wide">
            <div className="section-head">
              <div>
                <span className="eyebrow">
                  TACTICAL TRAINER
                </span>

                <h2>
                  Train your weakness
                </h2>
              </div>

              <button
                className="ghost-btn"
                onClick={loadPuzzles}
              >
                Refresh
              </button>
            </div>

            {puzzles.length ===
            0 ? (
              <div className="empty big">
                Play and analyze a few
                games to unlock
                personalized puzzles.
              </div>
            ) : (
              <div className="puzzle-layout">
                <div className="puzzle-board">
                  <Board
                    fen={
                      puzzles[
                        puzzleIndex
                      ]?.fen ||
                      new Chess().fen()
                    }
                    side="white"
                    onMove={() => {}}
                    disabled
                  />
                </div>

                <div className="puzzle-info">
                  <span className="eyebrow">
                    PUZZLE{" "}
                    {puzzleIndex + 1}/
                    {puzzles.length}
                  </span>

                  <h2>
                    {
                      puzzles[
                        puzzleIndex
                      ]?.theme ||
                      "Tactics"
                    }
                  </h2>

                  <p>
                    Rating{" "}
                    {
                      puzzles[
                        puzzleIndex
                      ]?.rating ||
                      "—"
                    }{" "}
                    • Find the best
                    continuation.
                  </p>

                  <button
                    className="gold-btn"
                    onClick={() =>
                      setPuzzleIndex(
                        (puzzleIndex +
                          1) %
                          puzzles.length
                      )
                    }
                  >
                    Next puzzle
                  </button>
                </div>
              </div>
            )}
          </Card>
        </section>
      )}

      {tab === "coach" && (
        <section className="content-grid">
          <Card className="wide coach">
            <div className="section-head">
              <div>
                <span className="eyebrow">
                  AI COACH
                </span>

                <h2>
                  Ask about your chess
                </h2>
              </div>
            </div>

            <div className="chat-window">
              {chat.length ===
                0 && (
                <div className="empty big">
                  Ask things like
                  “Why was my move
                  bad?” or “What should
                  I work on?”
                </div>
              )}

              {chat.map(
                (m, i) => (
                  <div
                    className={
                      m.role === "user"
                        ? "chat user"
                        : "chat"
                    }
                    key={i}
                  >
                    <span>
                      {m.role === "user"
                        ? "YOU"
                        : "COACH"}
                    </span>

                    <p>
                      {m.content}
                    </p>
                  </div>
                )
              )}
            </div>

            <div className="chat-input">
              <input
                value={question}
                onChange={e =>
                  setQuestion(
                    e.target.value
                  )
                }
                onKeyDown={e =>
                  e.key === "Enter" &&
                  ask()
                }
                placeholder="Ask your chess coach…"
              />

              <button
                className="gold-btn"
                onClick={ask}
              >
                Send
              </button>
            </div>
          </Card>
        </section>
      )}

      {tab === "rules" && (
        <section className="content-grid">
          <Card className="wide">
            <div className="section-head">
              <div>
                <span className="eyebrow">
                  CHESS KNOWLEDGE
                </span>

                <h2>
                  Rulebook
                </h2>
              </div>

              <div className="search">
                <input
                  value={ruleQuery}
                  onChange={e =>
                    setRuleQuery(
                      e.target.value
                    )
                  }
                  placeholder="Search a rule…"
                />

                <button
                  onClick={() =>
                    loadRules()
                  }
                >
                  Search
                </button>
              </div>
            </div>

            <div className="rules">
              {rules.map(
                (
                  r: any,
                  i: number
                ) => (
                  <div
                    className="rule"
                    key={r.id || i}
                  >
                    <span>
                      {r.category ||
                        "RULE"}
                    </span>

                    <h3>
                      {r.title}
                    </h3>

                    <p>
                      {r.description}
                    </p>
                  </div>
                )
              )}
            </div>
          </Card>
        </section>
      )}

      {tab === "profile" && (
        <section className="content-grid">
          <Card>
            <span className="eyebrow">
              PLAYER
            </span>

            <div className="profile-score">
              {profile?.est_elo ||
                800}
            </div>

            <p>
              Estimated rating
            </p>

            <div className="profile-line">
              <span>
                Games analyzed
              </span>

              <b>
                {profile?.games_played ||
                  0}
              </b>
            </div>

            <div className="profile-line">
              <span>
                Avg CP loss
              </span>

              <b>
                {profile?.avg_cp_loss ||
                  0}
              </b>
            </div>

            <div className="profile-line">
              <span>
                Primary weakness
              </span>

              <b>
                {profile?.primary_weakness ||
                  "general"}
              </b>
            </div>
          </Card>

          <Card className="wide">
            <span className="eyebrow">
              RECENT GAMES
            </span>

            <h2>
              Progress
            </h2>

            <div className="history">
              {(
                profile?.recent_games ||
                []
              ).map(
                (
                  g: any,
                  i: number
                ) => (
                  <div key={i}>
                    <span>
                      {new Date(
                        g.played_at
                      ).toLocaleDateString()}
                    </span>

                    <b>
                      {
                        g.primary_weakness
                      }
                    </b>

                    <span>
                      {g.avg_cp_loss} cp
                      loss
                    </span>
                  </div>
                )
              )}
            </div>
          </Card>

          <Card className="wide">
  <span className="eyebrow">
    GAME HISTORY
  </span>

  <h2>
    Games vs engine
  </h2>

  <p className="replay-hint">
    Click any saved game to open the full board replay.
  </p>

  <div className="history">
    {games.length === 0 ? (
      <div className="empty">
        No saved games yet. Finish a game and it will appear here.
      </div>
    ) : (
      games.map((g: any) => (
        <button
          className={`saved-game-row ${
            selectedGame?.id === g.id ? "selected" : ""
          }`}
          key={g.id}
          onClick={() => setSelectedGame(g)}
        >
          <span>
            {new Date(g.played_at).toLocaleString()}
          </span>

          <b>
            {g.result}
          </b>

          <span>
            {g.difficulty} · {g.num_moves} moves
          </span>

          <span className="saved-game-open">
            View game →
          </span>
        </button>
      ))
    )}
  </div>
</Card>

{selectedGame && (
  <GameReplay
    game={selectedGame}
    onClose={() => setSelectedGame(null)}
  />
)}
        </section>
      )}

      <footer>
        CHESSRL <span>•</span>{" "}
        YOUR ENGINE. YOUR GAMES.
        YOUR PROGRESS.
      </footer>
    </main>
  );
}
