import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  arrayUnion,
  increment,
} from "firebase/firestore";
import {
  Cpu,
  Eye,
  Shield,
  Zap,
  Ghost,
  Lock,
  Unlock,
  Terminal,
  Server,
  Wifi,
  AlertTriangle,
  LogOut,
  RotateCcw,
  CheckCircle,
  X,
  User,
  History,
  BookOpen,
  Crown,
  Database,
  Search,
  HardDrive,
  Code,
  Bug,
  Skull,
  ArrowRight,
  RefreshCw,
  ArrowLeftRight,
  HelpCircle,
  Trash2,
  Home,
  ScanEye,
  Hammer,
  Sparkles,
} from "lucide-react";

// ---------------------------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------------------------
// Use environment variables for configuration to avoid auth errors
const firebaseConfig = {
  apiKey: "AIzaSyBjIjK53vVJW1y5RaqEFGSFp0ECVDBEe1o",
  authDomain: "game-hub-ff8aa.firebaseapp.com",
  projectId: "game-hub-ff8aa",
  storageBucket: "game-hub-ff8aa.firebasestorage.app",
  messagingSenderId: "586559578902",
  appId: "1:586559578902:web:9afd57573258c43a6aa637",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const APP_ID =
  typeof __app_id !== "undefined" ? __app_id : "masquerade-protocol";
const GAME_ID = "17";

// ---------------------------------------------------------------------------
// GAME DATA & CONSTANTS
// ---------------------------------------------------------------------------

// --- AVATARS (Public Roles) ---
const AVATARS = {
  FIREWALL: {
    id: "FIREWALL",
    name: "Firewall",
    icon: Shield,
    color: "text-orange-500",
    bg: "bg-orange-950/50",
    border: "border-orange-600",
    passive: "Immune to Virus cards.",
    glitch: "Decrypt: Convert all VIRUS cards in your hand into INTEL cards.",
  },
  SEARCH_ENGINE: {
    id: "SEARCH_ENGINE",
    name: "Search Engine",
    icon: Search,
    color: "text-blue-400",
    bg: "bg-blue-950/50",
    border: "border-blue-600",
    passive: "Scan: Peek at 1 random card from a player's hand once per turn.",
    glitch: "Index: Look at ALL cards in target player's hand (Private).",
  },
  MINER: {
    id: "MINER",
    name: "Data Miner",
    icon: HardDrive,
    color: "text-emerald-400",
    bg: "bg-emerald-950/50",
    border: "border-emerald-600",
    passive: "Draw 2 cards instead of 1 at start of turn.",
    glitch: "Jackpot: Draw 5 cards immediately.",
  },
  GHOST: {
    id: "GHOST",
    name: "Ghost Process",
    icon: Ghost,
    color: "text-purple-400",
    bg: "bg-purple-950/50",
    border: "border-purple-600",
    passive: "Cannot be targeted by Glitch effects.",
    glitch: "Haunt: Swap your entire hand with target player.",
  },
  ADMIN: {
    id: "ADMIN",
    name: "Sys Admin",
    icon: Terminal,
    color: "text-red-500",
    bg: "bg-red-950/50",
    border: "border-red-600",
    passive: "Hand Limit increased by 2.",
    glitch: "Sudo: Force target player to discard 2 random cards.",
  },
};

// --- DIRECTIVES (Hidden Win Conditions) ---
const DIRECTIVES = {
  COLLECTOR: {
    id: "COLLECTOR",
    name: "The Collector",
    desc: "Win if you have 5 INTEL cards in hand.",
    icon: Database,
    color: "text-cyan-400",
  },
  SABOTEUR: {
    id: "SABOTEUR",
    name: "The Saboteur",
    desc: "Win if you hold at least 1 of each card type: INTEL, VIRUS, PING, PATCH.",
    icon: Bug,
    color: "text-lime-400",
  },
  ANARCHIST: {
    id: "ANARCHIST",
    name: "The Anarchist",
    desc: "Win if every living player has at least 1 VIRUS card.",
    icon: AlertTriangle,
    color: "text-yellow-400",
  },
  SURVIVOR: {
    id: "SURVIVOR",
    name: "The Survivor",
    desc: "Win if you are the last player standing.",
    icon: Shield,
    color: "text-orange-400",
  },
  CORRUPTOR: {
    id: "CORRUPTOR",
    name: "The Corruptor",
    desc: "Win if you have 4 VIRUS cards. (Overrides Elimination).",
    icon: Skull,
    color: "text-fuchsia-400",
  },
};

const HIDDEN_DIRECTIVE_INFO = {
  name: "Encrypted Signal",
  desc: "This player's objective is hidden. It will be revealed if they activate their Glitch.",
  icon: Lock,
  color: "text-slate-500",
};

// --- DATA PACKETS (Action Cards) ---
const PACKETS = {
  INTEL: {
    id: "INTEL",
    name: "Intel Packet",
    type: "RESOURCE",
    desc: "Collect these. Trade to swap data.",
    icon: Code,
    color: "text-cyan-300",
  },
  VIRUS: {
    id: "VIRUS",
    name: "Corrupt File",
    type: "HAZARD",
    desc: "3 Viruses = Crash. Trade to pass the bomb.",
    icon: Bug,
    color: "text-lime-400",
  },
  PING: {
    id: "PING",
    name: "Ping",
    type: "ACTION",
    desc: "Target player reveals 1 random card.",
    icon: Wifi,
    color: "text-yellow-400",
  },
  PATCH: {
    id: "PATCH",
    name: "Patch",
    type: "ACTION",
    desc: "Discard this to remove 1 Virus from your hand.",
    icon: CheckCircle,
    color: "text-blue-400",
  },
};

// Deck Composition
const DECK_TEMPLATE = [
  ...Array(15).fill("INTEL"),
  ...Array(10).fill("VIRUS"),
  ...Array(5).fill("PING"),
  ...Array(5).fill("PATCH"),
];

// ---------------------------------------------------------------------------
// UTILITIES
// ---------------------------------------------------------------------------
const shuffle = (array) => {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
};

// ---------------------------------------------------------------------------
// UI COMPONENTS
// ---------------------------------------------------------------------------

const FloatingBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black" />
    <div
      className="absolute inset-0 opacity-10"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    ></div>
    <div className="absolute top-0 left-0 w-full h-full bg-cyan-500/5 mix-blend-overlay" />
  </div>
);

const GameLogo = () => (
  <div className="flex items-center justify-center gap-2 opacity-60 mt-auto pb-4 pt-2 relative z-10 pointer-events-none">
    <Cpu size={16} className="text-cyan-500 animate-pulse" />
    <span className="text-[10px] font-black tracking-[0.2em] text-cyan-500 uppercase font-mono shadow-cyan-500/50 drop-shadow-md">
      MASQUERADE PROTOCOL
    </span>
  </div>
);

const ScanSelectionModal = ({ players, onSelect, onSkip }) => (
  <div className="fixed inset-0 bg-black/95 z-[190] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
    <div className="bg-slate-900 border-2 border-blue-500/50 p-6 rounded-xl max-w-sm w-full shadow-[0_0_30px_rgba(59,130,246,0.3)] text-center relative">
      <h3 className="text-xl font-black text-blue-400 mb-4 uppercase tracking-widest flex items-center justify-center gap-2">
        <ScanEye size={24} /> Passive Scan
      </h3>
      <p className="text-slate-400 text-xs mb-6">
        Search Engine Protocol: Select a target to reveal one random data packet
        from their hand.
      </p>

      <div className="grid gap-2 mb-4">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="w-full p-3 bg-slate-800 hover:bg-blue-900/30 border border-slate-700 hover:border-blue-500 rounded flex items-center justify-between group transition-all"
          >
            <span className="font-bold text-slate-200 group-hover:text-blue-300">
              {p.name}
            </span>
            <div className="text-[10px] bg-slate-950 px-2 py-1 rounded text-slate-500">
              {p.hand.length} Cards
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onSkip}
        className="text-slate-500 hover:text-white text-xs underline"
      >
        Skip Scan
      </button>
    </div>
  </div>
);

const RoleInfoModal = ({ item, onClose, onActivateGlitch, canGlitch }) => {
  if (!item) return null;
  const isAvatar = item.passive !== undefined;

  return (
    <div
      className="fixed inset-0 bg-black/90 z-[170] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-cyan-500/50 p-6 rounded-xl max-w-sm w-full shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-slate-400 hover:text-white"
        >
          <X />
        </button>

        <div className="flex flex-col items-center text-center">
          <div
            className={`p-4 rounded-full bg-slate-800 mb-4 border border-slate-600`}
          >
            {React.createElement(item.icon, {
              size: 48,
              className: item.color || "text-white",
            })}
          </div>
          <h3 className="text-2xl font-bold text-white mb-1 uppercase tracking-widest">
            {item.name}
          </h3>
          <div className="text-xs text-slate-500 mb-6 uppercase tracking-wider">
            {isAvatar ? "Public Identity" : "Hidden Agenda"}
          </div>

          <div className="space-y-4 w-full text-left bg-slate-950/50 p-4 rounded border border-slate-800">
            {isAvatar ? (
              <>
                <div>
                  <span className="text-cyan-400 font-bold block text-xs uppercase mb-1">
                    Passive Ability
                  </span>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {item.passive}
                  </p>
                </div>
                <div>
                  <span className="text-fuchsia-400 font-bold block text-xs uppercase mb-1">
                    Glitch (Ultimate)
                  </span>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {item.glitch}
                  </p>
                </div>
              </>
            ) : (
              <div>
                <span className="text-fuchsia-400 font-bold block text-xs uppercase mb-1">
                  Win Condition
                </span>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            )}
          </div>

          {onActivateGlitch && (
            <div className="mt-6 w-full">
              {canGlitch ? (
                <button
                  onClick={onActivateGlitch}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded flex items-center justify-center gap-2 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                >
                  <Zap size={18} /> ACTIVATE GLITCH
                </button>
              ) : (
                <div className="w-full py-3 bg-slate-800 text-slate-500 font-bold rounded flex items-center justify-center gap-2 cursor-not-allowed">
                  GLITCH UNAVAILABLE
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ActionResultModal = ({ data, onClose }) => {
  if (!data) return null;
  return (
    <div className="fixed inset-0 bg-black/95 z-[180] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-slate-900 border-2 border-yellow-500/50 p-6 rounded-xl max-w-sm w-full shadow-[0_0_30px_rgba(234,179,8,0.3)] text-center relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-slate-400 hover:text-white"
        >
          <X />
        </button>

        <h3 className="text-xl font-black text-yellow-400 mb-2 uppercase tracking-widest">
          {data.title}
        </h3>
        <p className="text-slate-300 mb-6 font-bold">{data.message}</p>

        {/* Cards Container */}
        {data.cards && data.cards.length > 0 && (
          <div className="flex justify-center gap-4 flex-wrap mb-6">
            {data.cards.map((card, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="mb-1 text-[10px] text-slate-500 uppercase tracking-wider">
                  {card.label}
                </div>
                <div className="scale-90 origin-top">
                  <CardDisplay type={card.type} />
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded uppercase tracking-wider"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

const FeedbackOverlay = ({ type, message, subtext, icon: Icon }) => (
  <div className="fixed inset-0 z-[160] flex items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-300">
    <div
      className={`
      flex flex-col items-center justify-center p-8 md:p-12 rounded-3xl border-4 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden
      ${
        type === "glitch"
          ? "bg-fuchsia-900/80 border-fuchsia-500 text-fuchsia-100"
          : type === "success"
          ? "bg-green-900/80 border-green-500 text-green-100"
          : type === "failure"
          ? "bg-red-900/80 border-red-500 text-red-100"
          : "bg-cyan-900/80 border-cyan-500 text-cyan-100"
      }
    `}
    >
      {type === "glitch" && (
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#fff_3px)]" />
      )}
      {Icon && (
        <div className="mb-4 p-4 bg-black/30 rounded-full border border-white/10">
          <Icon size={64} className="animate-pulse" />
        </div>
      )}
      <h2 className="text-3xl md:text-5xl font-black uppercase tracking-widest text-center drop-shadow-md mb-2 font-mono">
        {message}
      </h2>
      {subtext && (
        <p className="text-lg md:text-xl font-bold opacity-90 tracking-wide text-center font-mono">
          {subtext}
        </p>
      )}
    </div>
  </div>
);

const CardDisplay = ({ type, onClick, disabled, highlight, small, tiny }) => {
  const info = PACKETS[type];
  if (!info) return <div className="w-16 h-24 bg-gray-800 rounded"></div>;

  if (tiny) {
    return (
      <div
        className={`w-5 h-7 rounded flex items-center justify-center bg-slate-800 border border-slate-600 shadow-sm`}
        title={info.name}
      >
        <info.icon size={12} className={info.color} />
      </div>
    );
  }

  const sizeClasses = small ? "w-16 h-24 p-1" : "w-24 h-32 md:w-28 md:h-40 p-2";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative rounded-lg border border-slate-600 bg-slate-900 shadow-lg transition-all flex flex-col items-center justify-between
        ${sizeClasses}
        ${highlight ? "ring-2 ring-cyan-400 scale-105 z-10" : ""}
        ${
          disabled
            ? "opacity-50 grayscale cursor-not-allowed"
            : "hover:scale-105 cursor-pointer hover:border-slate-400"
        }
      `}
    >
      <div className="w-full text-right">
        <div
          className={`w-2 h-2 rounded-full ${info.color.replace(
            "text",
            "bg"
          )} ml-auto`}
        ></div>
      </div>

      <info.icon size={small ? 20 : 32} className={info.color} />

      <div className="text-center w-full">
        <div className="text-[10px] md:text-xs font-bold text-white leading-none mb-1 font-mono">
          {info.name}
        </div>
        {!small && (
          <div className="text-[8px] text-slate-400 leading-tight">
            {info.type}
          </div>
        )}
      </div>
    </button>
  );
};

const GuideModal = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
    <div className="bg-slate-900 border border-cyan-500/30 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden font-mono">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
        <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-2 tracking-wider">
          <BookOpen className="text-cyan-500" /> SYSTEM MANUAL
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
        >
          <X />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-8 text-slate-300">
        <section>
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <Crown size={20} className="text-fuchsia-400" /> Objective
          </h3>
          <p className="mb-4">
            You are a rogue AI. You have a public{" "}
            <strong className="text-cyan-400">Avatar</strong> and a hidden{" "}
            <strong className="text-fuchsia-400">Directive</strong>. Complete
            your Directive to win.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <User size={20} className="text-cyan-400" /> Public Avatars
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.values(AVATARS).map((avatar) => (
              <div
                key={avatar.id}
                className={`p-3 rounded border bg-slate-800/50 ${avatar.border.replace(
                  "border-",
                  "border-l-4 border-l-"
                )}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {React.createElement(avatar.icon, {
                    size: 16,
                    className: avatar.color,
                  })}
                  <strong className={`text-sm uppercase ${avatar.color}`}>
                    {avatar.name}
                  </strong>
                </div>
                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-slate-500 font-bold">PASSIVE:</span>{" "}
                    {avatar.passive}
                  </div>
                  <div>
                    <span className="text-fuchsia-500 font-bold">GLITCH:</span>{" "}
                    {avatar.glitch}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <Eye size={20} className="text-fuchsia-400" /> Hidden Directives
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Each player has one secret win condition. It is revealed only if
            they activate their Glitch.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.values(DIRECTIVES).map((dir) => (
              <div
                key={dir.id}
                className="p-3 rounded border border-l-4 border-l-fuchsia-500 border-slate-700 bg-slate-800/50"
              >
                <div className="flex items-center gap-2 mb-1">
                  {React.createElement(dir.icon, {
                    size: 16,
                    className: dir.color,
                  })}
                  <strong className={`text-sm uppercase ${dir.color}`}>
                    {dir.name}
                  </strong>
                </div>
                <div className="text-xs text-slate-300">{dir.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-3">Turn Cycle</h3>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-400">
            <li>
              <strong className="text-white">Draw Phase:</strong> Draw 1 Card
              (Miners draw 2). If deck is empty, discard pile shuffles.
            </li>
            <li>
              <strong className="text-white">Action Phase:</strong> Play 1
              Action Card (Ping/Patch) OR{" "}
              <strong className="text-cyan-400">Trade</strong> a resource
              (Intel/Virus) with another player.
            </li>
            <li>
              <strong className="text-white">End Phase:</strong> Check for Virus
              Overload (3 Viruses = Crash). Discard down to Hand Limit (Default
              5, Admin 7).
            </li>
          </ol>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-3">Actions</h3>
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-400">
            <li>
              <strong className="text-yellow-400">PING:</strong> Reveal 1 random
              card from an opponent's hand.
            </li>
            <li>
              <strong className="text-blue-400">PATCH:</strong> Remove 1 Virus
              from your hand.
            </li>
            <li>
              <strong className="text-cyan-400">TRADE (Intel/Virus):</strong>{" "}
              Select an Intel/Virus card, then click a player. You give them
              your card, you get a random card from them.
            </li>
          </ul>
        </section>
      </div>
      <div className="p-4 bg-slate-950 border-t border-slate-800">
        <button
          onClick={onClose}
          className="w-full bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-500/50 text-cyan-100 py-3 rounded font-bold transition-all"
        >
          ACKNOWLEDGE
        </button>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// MAIN GAME COMPONENT
// ---------------------------------------------------------------------------

export default function MasqueradeProtocol() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("menu");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  // PERSISTENCE FIX: Load room ID from local storage
  const [roomId, setRoomId] = useState(
    localStorage.getItem("masquerade_room_id") || ""
  );
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [isMaintenance, setIsMaintenance] = useState(false);

  // UI State
  const [showGuide, setShowGuide] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [selectedCardIdx, setSelectedCardIdx] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [glitchConfirm, setGlitchConfirm] = useState(false);
  const [inspectingItem, setInspectingItem] = useState(null);
  const [actionQueue, setActionQueue] = useState([]); // CHANGED: Queue for modals
  const [showScanSelection, setShowScanSelection] = useState(false); // Modal state for Search Engine
  const lastEventIdRef = useRef(0);

  // --- AUTH ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // Helper to add action to queue
  const queueAction = (data) => {
    setActionQueue((prev) => [...prev, data]);
  };

  // --- ROOM SYNC & EVENT LISTENER ---
  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(
      doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();

          // SAFETY CHECK: Am I still in the room? (Kicked check)
          const amIInRoom = data.players.find((p) => p.id === user?.uid);
          if (user && !amIInRoom) {
            setRoomId("");
            localStorage.removeItem("masquerade_room_id");
            setView("menu");
            setError("Disconnected from server.");
            return;
          }

          setGameState(data);
          if (data.status === "lobby") setView("lobby");
          else if (data.status === "playing" || data.status === "finished")
            setView("game");

          // CHECK FOR SEARCH ENGINE PASSIVE TRIGGER
          const me = data.players.find((p) => p.id === user.uid);
          const myIdx = data.players.findIndex((p) => p.id === user.uid);
          if (
            me &&
            data.turnIndex === myIdx &&
            me.avatar === "SEARCH_ENGINE" &&
            !me.passiveUsed
          ) {
            setShowScanSelection(true);
          } else {
            setShowScanSelection(false);
          }

          // EVENT LISTENER FOR MODALS
          if (data.lastEvent && data.lastEvent.id > lastEventIdRef.current) {
            const event = data.lastEvent;
            lastEventIdRef.current = event.id;

            // Only show modal if I am the target of the event
            if (user && event.targetId === user.uid) {
              let newModalData = null;

              if (event.type === "PING") {
                newModalData = {
                  title: "SYSTEM ALERT: PINGED",
                  message: `${event.initiatorName} revealed your data:`,
                  cards: [
                    { type: event.payload.revealedCard, label: "Revealed" },
                  ],
                };
              } else if (event.type === "TRADE") {
                newModalData = {
                  title: "DATA TRANSFER",
                  message: `${event.initiatorName} traded with you.`,
                  cards: [
                    { type: event.payload.given, label: "You Received" },
                    { type: event.payload.received, label: "You Gave" },
                  ],
                };
              } else if (event.type === "GLITCH_ADMIN") {
                newModalData = {
                  title: "SYSTEM BREACH: SUDO",
                  message: `${event.initiatorName} forced deletion of data.`,
                  cards: event.payload.deleted.map((c) => ({
                    type: c,
                    label: "Lost",
                  })),
                };
              } else if (event.type === "GLITCH_GHOST") {
                newModalData = {
                  title: "SYSTEM BREACH: HAUNT",
                  message: `${event.initiatorName} swapped hands with you.`,
                  cards: [],
                };
              } else if (event.type === "GLITCH_SEARCH") {
                newModalData = {
                  title: "SECURITY ALERT",
                  message: `${event.initiatorName} indexed (viewed) your entire hand.`,
                  cards: [],
                };
              } else if (event.type === "SYSTEM_DISCARD") {
                newModalData = {
                  title: "MEMORY OVERFLOW",
                  message: `Hand limit exceeded. Auto-purged data:`,
                  cards: event.payload.discards.map((c) => ({
                    type: c,
                    label: "Purged",
                  })),
                };
              }

              // Append discards if they exist on a non-discard event (e.g. Trade caused overflow)
              if (
                newModalData &&
                event.payload &&
                event.payload.discards &&
                event.type !== "SYSTEM_DISCARD"
              ) {
                newModalData.message += " (Memory Overflow Purge)";
                newModalData.cards.push(
                  ...event.payload.discards.map((c) => ({
                    type: c,
                    label: "Purged",
                  }))
                );
              }

              if (newModalData) queueAction(newModalData);
            }
          }
        } else {
          // Room deleted by host
          setView("menu");
          setRoomId("");
          localStorage.removeItem("masquerade_room_id");
          setError("Connection Terminated (Room Closed).");
        }
      }
    );
    return () => unsub();
  }, [roomId, user]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "game_hub_settings", "config"), (doc) => {
      if (doc.exists() && doc.data()[GAME_ID]?.maintenance)
        setIsMaintenance(true);
      else setIsMaintenance(false);
    });
    return () => unsub();
  }, []);

  // --- HELPERS ---
  const triggerFeedback = (type, msg, sub, icon) => {
    setFeedback({ type, message: msg, subtext: sub, icon });
    setTimeout(() => setFeedback(null), 2500);
  };

  // --- ACTIONS ---

  const createRoom = async () => {
    if (!playerName) return setError("Identify yourself.");
    setLoading(true);
    const newId = Math.random().toString(36).substring(2, 7).toUpperCase();
    const initialData = {
      roomId: newId,
      hostId: user.uid,
      status: "lobby",
      players: [
        {
          id: user.uid,
          name: playerName,
          avatar: null,
          directive: null,
          hand: [],
          revealed: false,
          glitchUsed: false,
          isEliminated: false,
          ready: false,
          passiveUsed: false,
        },
      ],
      deck: [],
      discardPile: [],
      turnIndex: 0,
      logs: [],
      winnerId: null,
    };
    await setDoc(
      doc(db, "artifacts", APP_ID, "public", "data", "rooms", newId),
      initialData
    );
    setRoomId(newId);
    localStorage.setItem("masquerade_room_id", newId); // Persist
    setLoading(false);
  };

  const joinRoom = async () => {
    if (!roomCode || !playerName) return setError("Input credentials.");
    setLoading(true);
    const ref = doc(
      db,
      "artifacts",
      APP_ID,
      "public",
      "data",
      "rooms",
      roomCode
    );
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      setError("Server not found.");
      setLoading(false);
      return;
    }
    const data = snap.data();
    if (data.status !== "lobby") {
      setError("Session locked.");
      setLoading(false);
      return;
    }
    if (data.players.length >= 8) {
      setError("Server full.");
      setLoading(false);
      return;
    }
    // Check if player already exists (rejoining)
    const existingPlayer = data.players.find((p) => p.id === user.uid);
    if (!existingPlayer) {
      const newPlayers = [
        ...data.players,
        {
          id: user.uid,
          name: playerName,
          avatar: null,
          directive: null,
          hand: [],
          revealed: false,
          glitchUsed: false,
          isEliminated: false,
          ready: false,
          passiveUsed: false,
        },
      ];
      await updateDoc(ref, { players: newPlayers });
    }

    setRoomId(roomCode);
    localStorage.setItem("masquerade_room_id", roomCode); // Persist
    setLoading(false);
  };

  const kickPlayer = async (targetId) => {
    if (!roomId) return;
    const ref = doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId);
    const newPlayers = gameState.players.filter((p) => p.id !== targetId);

    await updateDoc(ref, {
      players: newPlayers,
      logs: arrayUnion({
        text: `A player was removed from the session.`,
        type: "danger",
        id: Date.now(),
        viewerId: "all",
      }),
    });
  };

  const startGame = async () => {
    if (gameState.hostId !== user.uid) return;

    // Assign Roles
    const avatarKeys = shuffle(Object.keys(AVATARS));
    const directiveKeys = shuffle(Object.keys(DIRECTIVES));
    const deck = shuffle([...DECK_TEMPLATE]);

    const players = gameState.players.map((p, i) => {
      const hand = [deck.pop(), deck.pop(), deck.pop()];
      return {
        ...p,
        avatar: avatarKeys[i % avatarKeys.length],
        directive: directiveKeys[i % directiveKeys.length],
        hand,
        ready: false,
        passiveUsed: false,
      };
    });

    await updateDoc(
      doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
      {
        status: "playing",
        players,
        deck,
        discardPile: [],
        turnIndex: 0,
        logs: [
          {
            text: "System Initialized. Masquerade Protocol Active.",
            type: "neutral",
            id: Date.now(),
            viewerId: "all",
          },
        ],
      }
    );
  };

  const handleLeave = async () => {
    if (!roomId) return;
    const ref = doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId);

    // IF HOST: Delete room, forcing everyone to menu
    if (gameState.hostId === user.uid) {
      await deleteDoc(ref);
    } else {
      // IF GUEST: Just remove self
      let newPlayers = gameState.players.filter((p) => p.id !== user.uid);
      let updates = { players: newPlayers };
      updates.logs = arrayUnion({
        text: `${
          gameState.players.find((p) => p.id === user.uid)?.name || "User"
        } disconnected.`,
        type: "danger",
        id: Date.now(),
        viewerId: "all",
      });
      await updateDoc(ref, updates);
    }

    setRoomId("");
    localStorage.removeItem("masquerade_room_id");
    setView("menu");
    setShowLeaveConfirm(false);
  };

  const returnToLobby = async () => {
    if (gameState.hostId !== user.uid) return;
    const players = gameState.players.map((p) => ({
      ...p,
      hand: [],
      avatar: null,
      directive: null,
      revealed: false,
      glitchUsed: false,
      isEliminated: false,
      ready: false,
      passiveUsed: false,
    }));
    await updateDoc(
      doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
      {
        status: "lobby",
        players,
        deck: [],
        discardPile: [],
        winnerId: null,
        logs: [],
        lastEvent: null, // Clear last event
      }
    );
    setShowLeaveConfirm(false);
  };

  const toggleReady = async () => {
    if (!roomId) return;
    const ref = doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId);
    const myIdx = gameState.players.findIndex((p) => p.id === user.uid);
    if (myIdx === -1) return;

    const updatedPlayers = [...gameState.players];
    updatedPlayers[myIdx].ready = true;

    await updateDoc(ref, { players: updatedPlayers });
  };

  // --- GAMEPLAY LOGIC ---

  const checkWinConditions = async (players, logs) => {
    for (const p of players) {
      if (p.isEliminated) continue;
      const directive = p.directive;
      const hand = p.hand;
      let won = false;

      if (directive === "COLLECTOR") {
        if (hand.filter((c) => c === "INTEL").length >= 5) won = true;
      } else if (directive === "CORRUPTOR") {
        if (hand.filter((c) => c === "VIRUS").length >= 4) won = true;
      } else if (directive === "ANARCHIST") {
        const living = players.filter((pl) => !pl.isEliminated);
        if (
          living.every((pl) => pl.hand.includes("VIRUS")) &&
          living.length > 1
        )
          won = true;
      } else if (directive === "SABOTEUR") {
        // SABOTEUR NEW WIN CONDITION: 1 of each card type
        const hasIntel = hand.includes("INTEL");
        const hasVirus = hand.includes("VIRUS");
        const hasPing = hand.includes("PING");
        const hasPatch = hand.includes("PATCH");
        if (hasIntel && hasVirus && hasPing && hasPatch) won = true;
      } else if (directive === "SURVIVOR") {
        const living = players.filter((pl) => !pl.isEliminated);
        if (living.length === 1 && living[0].id === p.id) won = true;
      }

      if (won) {
        return p.id;
      }
    }
    return null;
  };

  const nextTurn = async (
    updatedPlayers,
    deck,
    discardPile,
    logs,
    eventData = null
  ) => {
    // 1. Current Player Hand Limit Check (Discard Phase)
    const currentP = updatedPlayers[gameState.turnIndex];
    let discardedCards = []; // Track discarded cards

    if (!currentP.isEliminated) {
      const limit = currentP.avatar === "ADMIN" ? 7 : 5;
      while (currentP.hand.length > limit) {
        const randomIdx = Math.floor(Math.random() * currentP.hand.length);
        const discarded = currentP.hand.splice(randomIdx, 1)[0];
        discardPile.push(discarded);
        discardedCards.push(discarded);
        logs.push({
          text: `${currentP.name} discarded excess data (${discarded}).`,
          type: "neutral",
          id: Date.now() + discardedCards.length,
          viewerId: "all",
        });
      }
    }

    // LOCAL MODAL for self (if I discarded)
    if (discardedCards.length > 0) {
      queueAction({
        title: "MEMORY OVERFLOW",
        message: `Hand limit exceeded. Auto-purged data:`,
        cards: discardedCards.map((c) => ({ type: c, label: "Purged" })),
      });
      // We do NOT modify eventData to show discards to others or the listener.
      // It's handled locally for the discarding player.
    }

    // 2. IMMEDIATE WIN CHECK (Priority over Death) - CORRUPTOR FIX
    let winnerId = await checkWinConditions(updatedPlayers, logs);
    if (winnerId) {
      const resetReadyPlayers = updatedPlayers.map((p) => ({
        ...p,
        ready: false,
      }));
      const updates = {
        players: resetReadyPlayers,
        status: "finished",
        winnerId,
        discardPile,
        logs: arrayUnion(...logs, {
          text: `Runtime Complete. Winner found.`,
          type: "success",
          id: Date.now() + 2,
          viewerId: "all",
        }),
      };
      if (eventData) updates.lastEvent = eventData;

      await updateDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
        updates
      );
      return;
    }

    // 3. Virus Overload Check
    if (!currentP.isEliminated && currentP.avatar !== "FIREWALL") {
      const virusCount = currentP.hand.filter((c) => c === "VIRUS").length;
      if (virusCount >= 3) {
        currentP.isEliminated = true;
        discardPile.push(...currentP.hand);
        currentP.hand = [];

        logs.push({
          text: `SYSTEM CRASH: ${currentP.name} overloaded by Viruses!`,
          type: "danger",
          id: Date.now() + 1,
          viewerId: "all",
        });
        triggerFeedback("failure", "SYSTEM CRASH", "Eliminated by Virus", Bug);
      }
    }

    // 4. Find Next Player
    let nextIdx = (gameState.turnIndex + 1) % updatedPlayers.length;
    let loop = 0;
    while (
      updatedPlayers[nextIdx].isEliminated &&
      loop < updatedPlayers.length
    ) {
      nextIdx = (nextIdx + 1) % updatedPlayers.length;
      loop++;
    }
    const nextP = updatedPlayers[nextIdx];

    // RESET PASSIVE FOR NEXT PLAYER
    nextP.passiveUsed = false;

    // 5. Draw Phase (Next Player)
    let drawCount = 1;
    if (nextP.avatar === "MINER") drawCount = 2;

    for (let i = 0; i < drawCount; i++) {
      if (deck.length === 0) {
        if (discardPile.length > 0) {
          deck = shuffle([...discardPile]);
          discardPile = [];
          logs.push({
            text: "Deck rebooted (Reshuffled discard pile).",
            type: "neutral",
            id: Date.now() + 3,
            viewerId: "all",
          });
        } else {
          break;
        }
      }
      if (deck.length > 0) nextP.hand.push(deck.pop());
    }

    // 6. IMMEDIATE WIN CHECK (Next Player after drawing)
    winnerId = await checkWinConditions(updatedPlayers, logs);
    if (winnerId) {
      const resetReadyPlayers = updatedPlayers.map((p) => ({
        ...p,
        ready: false,
      }));
      const updates = {
        players: resetReadyPlayers,
        status: "finished",
        winnerId,
        discardPile,
        logs: arrayUnion(...logs, {
          text: `Runtime Complete. Winner found.`,
          type: "success",
          id: Date.now() + 4,
          viewerId: "all",
        }),
      };
      if (eventData) updates.lastEvent = eventData;

      await updateDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
        updates
      );
      return;
    }

    logs.push({
      text: `Processing cycle: ${nextP.name}`,
      type: "neutral",
      id: Date.now() + 5,
      viewerId: "all",
    });

    const updates = {
      players: updatedPlayers,
      deck,
      discardPile,
      turnIndex: nextIdx,
      logs: arrayUnion(...logs),
    };
    if (eventData) updates.lastEvent = eventData;

    await updateDoc(
      doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
      updates
    );
  };

  const handlePassiveScan = async (targetId) => {
    // Handles both scan selection and skipping (if targetId is null/undefined)
    if (!roomId) return;
    const pIdx = gameState.players.findIndex((p) => p.id === user.uid);
    const me = gameState.players[pIdx];

    if (me.passiveUsed) return; // Guard

    // Update Firestore (Mark passive as used)
    const ref = doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId);
    const updatedPlayers = [...gameState.players];
    updatedPlayers[pIdx].passiveUsed = true;

    const updates = {
      players: updatedPlayers,
      logs: arrayUnion({
        text: `${me.name} ${
          targetId ? "ran a passive background scan." : "skipped passive scan."
        }`,
        type: "neutral",
        id: Date.now(),
        viewerId: "all",
      }),
    };

    if (targetId) {
      const target = gameState.players.find((p) => p.id === targetId);
      if (target && target.hand.length > 0) {
        // Logic: Reveal 1 random card
        const randIdx = Math.floor(Math.random() * target.hand.length);
        const revealedCard = target.hand[randIdx];

        // Update State Locally for Modal
        queueAction({
          title: "PASSIVE SCAN RESULT",
          message: `Scanner intercepted ${target.name}'s packet:`,
          cards: [{ type: revealedCard, label: "Intercepted" }],
        });
      }
    }

    await updateDoc(ref, updates);
    // Modal closing is handled by state derived from gameState in useEffect
  };

  const handlePlayCard = async (targetId = null) => {
    if (selectedCardIdx === null) return;
    const pIdx = gameState.players.findIndex((p) => p.id === user.uid);
    const me = gameState.players[pIdx];
    const cardType = me.hand[selectedCardIdx];

    const players = JSON.parse(JSON.stringify(gameState.players));
    let deck = [...gameState.deck];
    let discardPile = [...(gameState.discardPile || [])];
    const logs = [];
    let eventData = null;

    // Remove Card from Hand
    players[pIdx].hand.splice(selectedCardIdx, 1);

    if (cardType === "PATCH") {
      discardPile.push("PATCH");
      const virusIdx = players[pIdx].hand.indexOf("VIRUS");
      if (virusIdx > -1) {
        players[pIdx].hand.splice(virusIdx, 1);
        discardPile.push("VIRUS");
        logs.push({
          text: `${me.name} ran a Patch. Virus purged.`,
          type: "success",
          id: Date.now(),
          viewerId: "all",
        });
      } else {
        logs.push({
          text: `${me.name} ran a Patch but had no Virus.`,
          type: "neutral",
          id: Date.now(),
          viewerId: "all",
        });
      }
    } else if (cardType === "PING") {
      discardPile.push("PING");
      if (!targetId) return;
      const target = players.find((p) => p.id === targetId);
      if (target.hand.length > 0) {
        const randIdx = Math.floor(Math.random() * target.hand.length);
        const revealedCard = target.hand[randIdx];

        eventData = {
          id: Date.now(),
          type: "PING",
          initiatorId: user.uid,
          initiatorName: me.name,
          targetId: targetId,
          payload: { revealedCard },
        };

        // PING MODAL (Self)
        queueAction({
          title: "PING RESULT",
          message: `You revealed ${target.name}'s data:`,
          cards: [{ type: revealedCard, label: "Revealed" }],
        });

        logs.push({
          text: `PING: ${target.name} has a ${revealedCard}.`,
          type: "warning",
          id: Date.now(),
          viewerId: "all",
        });
      }
    } else {
      // TRADE LOGIC
      if (!targetId) {
        discardPile.push(cardType);
        logs.push({
          text: `${me.name} discarded ${cardType}.`,
          type: "neutral",
          id: Date.now(),
          viewerId: "all",
        });
      } else {
        // Perform Swap
        const tIdx = players.findIndex((p) => p.id === targetId);
        const target = players[tIdx];

        if (target.hand.length > 0) {
          const randIdx = Math.floor(Math.random() * target.hand.length);
          const stolenCard = target.hand.splice(randIdx, 1)[0];

          target.hand.push(cardType);
          players[pIdx].hand.push(stolenCard);

          eventData = {
            id: Date.now(),
            type: "TRADE",
            initiatorId: user.uid,
            initiatorName: me.name,
            targetId: targetId,
            payload: { given: cardType, received: stolenCard },
          };

          // TRADE MODAL (Self)
          queueAction({
            title: "TRADE COMPLETE",
            message: `Exchange with ${target.name} successful.`,
            cards: [
              { type: cardType, label: "You Gave" },
              { type: stolenCard, label: "You Received" },
            ],
          });

          logs.push({
            text: `${me.name} traded data with ${target.name}.`,
            type: "warning",
            id: Date.now(),
            viewerId: "all",
          });
        } else {
          target.hand.push(cardType);
          logs.push({
            text: `${me.name} transferred data to ${target.name} (Empty hand).`,
            type: "neutral",
            id: Date.now(),
            viewerId: "all",
          });
        }
      }
    }

    setSelectedCardIdx(null);

    // CHECK WIN IMMEDIATELY AFTER ACTION
    const winnerId = await checkWinConditions(players, logs);
    if (winnerId) {
      const resetReadyPlayers = players.map((p) => ({ ...p, ready: false }));
      const updates = {
        players: resetReadyPlayers,
        status: "finished",
        winnerId,
        discardPile,
        logs: arrayUnion(...logs, {
          text: `Runtime Complete. Winner found.`,
          type: "success",
          id: Date.now(),
          viewerId: "all",
        }),
      };
      if (eventData) updates.lastEvent = eventData;

      await updateDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
        updates
      );
      return;
    }

    await nextTurn(players, deck, discardPile, logs, eventData);
  };

  const activateGlitch = async (targetId = null) => {
    const pIdx = gameState.players.findIndex((p) => p.id === user.uid);
    const me = gameState.players[pIdx];

    if (me.glitchUsed) return;

    // GHOST IMMUNITY CHECK
    if (targetId) {
      const target = gameState.players.find((p) => p.id === targetId);
      if (target && target.avatar === "GHOST") {
        setGlitchConfirm(false);
        triggerFeedback(
          "failure",
          "TARGET IMMUNE",
          "Ghost Process blocks Glitch effects.",
          Shield
        );
        return;
      }
    }

    const players = JSON.parse(JSON.stringify(gameState.players));
    const deck = [...gameState.deck];
    let discardPile = [...(gameState.discardPile || [])];
    const logs = [];
    let eventData = null;

    players[pIdx].glitchUsed = true;
    players[pIdx].revealed = true; // REVEAL DIRECTIVE
    logs.push({
      text: `⚠️ GLITCH DETECTED: ${me.name} is ${
        DIRECTIVES[me.directive].name
      }!`,
      type: "glitch",
      id: Date.now(),
      viewerId: "all",
    });
    triggerFeedback("glitch", "GLITCH ACTIVATED", "Directive Revealed!", Zap);

    const avatar = me.avatar;

    if (avatar === "FIREWALL") {
      // NEW GLITCH: Convert Virus to Intel
      let convertedCount = 0;
      players[pIdx].hand = players[pIdx].hand.map((c) => {
        if (c === "VIRUS") {
          convertedCount++;
          return "INTEL";
        }
        return c;
      });

      queueAction({
        title: "SYSTEM DECRYPTION",
        message: `${convertedCount} Virus(es) decrypted into Intel.`,
        cards: [],
      });

      logs.push({
        text: "Firewall Decryption complete. Malicious code converted to valuable data.",
        type: "success",
        id: Date.now() + 1,
        viewerId: "all",
      });
    } else if (avatar === "MINER") {
      let drawn = 0;
      for (let i = 0; i < 5; i++) {
        if (deck.length === 0 && discardPile.length > 0) {
          const newDeck = shuffle([...discardPile]);
          discardPile = [];
          deck.push(...newDeck);
        }
        if (deck.length > 0) {
          players[pIdx].hand.push(deck.pop());
          drawn++;
        }
      }

      queueAction({
        title: "JACKPOT",
        message: `You mined ${drawn} new data packets.`,
        cards: [],
      });

      logs.push({
        text: "Miner hit the Jackpot. 5 Cards drawn.",
        type: "success",
        id: Date.now() + 1,
        viewerId: "all",
      });
    } else if (avatar === "GHOST") {
      if (!targetId) return;
      const tIdx = players.findIndex((p) => p.id === targetId);
      const myHand = [...players[pIdx].hand];
      players[pIdx].hand = [...players[tIdx].hand];
      players[tIdx].hand = myHand;

      eventData = {
        id: Date.now(),
        type: "GLITCH_GHOST",
        initiatorId: user.uid,
        initiatorName: me.name,
        targetId: targetId,
        payload: {},
      };

      queueAction({
        title: "GHOST HAUNT",
        message: `Swapped hands with ${players[tIdx].name}.`,
        cards: [],
      });

      logs.push({
        text: `Ghost Process Haunt. Hands swapped with ${players[tIdx].name}.`,
        type: "warning",
        id: Date.now() + 1,
        viewerId: "all",
      });
    } else if (avatar === "ADMIN") {
      if (!targetId) return;
      const tIdx = players.findIndex((p) => p.id === targetId);
      const targetP = players[tIdx];

      let deleted = [];
      if (targetP.hand.length >= 2) {
        const d1 = targetP.hand.splice(0, 1)[0];
        const d2 = targetP.hand.splice(0, 1)[0];
        discardPile.push(d1, d2);
        deleted = [d1, d2];
      } else {
        deleted = [...targetP.hand];
        discardPile.push(...targetP.hand);
        targetP.hand = [];
      }

      eventData = {
        id: Date.now(),
        type: "GLITCH_ADMIN",
        initiatorId: user.uid,
        initiatorName: me.name,
        targetId: targetId,
        payload: { deleted },
      };

      // Show GENERIC message to Admin, not specific cards (User request)
      queueAction({
        title: "SUDO COMMAND",
        message: `Forced ${targetP.name} to delete ${deleted.length} data packets.`,
        cards: [],
      });

      logs.push({
        text: `Admin Sudo command. ${targetP.name} forced to delete data.`,
        type: "danger",
        id: Date.now() + 1,
        viewerId: "all",
      });
    } else if (avatar === "SEARCH_ENGINE") {
      if (!targetId) return;
      const target = players.find((p) => p.id === targetId);

      eventData = {
        id: Date.now(),
        type: "GLITCH_SEARCH",
        initiatorId: user.uid,
        initiatorName: me.name,
        targetId: targetId,
        payload: {},
      };

      // INDEX MODAL (Self)
      queueAction({
        title: "INDEX RESULTS",
        message: `${target.name}'s current database:`,
        cards: target.hand.map((c) => ({ type: c, label: "Held" })),
      });

      logs.push({
        text: `INDEX RESULTS (${target.name}): ${target.hand.join(", ")}`,
        type: "glitch",
        id: Date.now() + 1,
        viewerId: user.uid,
      });
      logs.push({
        text: `${me.name} Indexed ${target.name}'s data.`,
        type: "warning",
        id: Date.now() + 2,
        viewerId: "all",
      });
    }

    setGlitchConfirm(false);

    // CHECK WIN IMMEDIATELY AFTER GLITCH
    const winnerId = await checkWinConditions(players, logs);
    if (winnerId) {
      const resetReadyPlayers = players.map((p) => ({ ...p, ready: false }));
      const updates = {
        players: resetReadyPlayers,
        status: "finished",
        winnerId,
        discardPile,
        logs: arrayUnion(...logs, {
          text: `Runtime Complete. Winner found.`,
          type: "success",
          id: Date.now(),
          viewerId: "all",
        }),
      };
      if (eventData) updates.lastEvent = eventData;

      await updateDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
        updates
      );
      return;
    }

    await nextTurn(players, deck, discardPile, logs, eventData);
  };

  if (isMaintenance) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white p-4 text-center">
        <div className="bg-orange-500/10 p-8 rounded-2xl border border-orange-500/30">
          <Hammer
            size={64}
            className="text-orange-500 mx-auto mb-4 animate-bounce"
          />
          <h1 className="text-3xl font-bold mb-2">Under Maintenance</h1>
          <p className="text-gray-400">
            The AI is glitched. Wait for replaceet hardware.
          </p>
        </div>
        {/* Add Spacing Between Boxes */}
        <div className="h-8"></div>

        {/* Clickable Second Card */}
        <a href="https://rawfidkshuvo.github.io/gamehub/">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="text-center pb-12 animate-pulse">
              <div className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900/50 rounded-full border border-indigo-500/20 text-indigo-300 font-bold tracking-widest text-sm uppercase backdrop-blur-sm">
                <Sparkles size={16} /> Visit Gamehub...Try our other releases...{" "}
                <Sparkles size={16} />
              </div>
            </div>
          </div>
        </a>
      </div>
    );
  }

  // --- RENDER ---

  if (view === "menu") {
    return (
      <div className="min-h-screen bg-slate-950 text-cyan-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-mono">
        <FloatingBackground />
        {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

        <div className="z-10 text-center mb-10 animate-in fade-in zoom-in duration-700">
          <Cpu
            size={64}
            className="text-cyan-500 mx-auto mb-4 animate-pulse drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]"
          />
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 to-blue-600 tracking-widest drop-shadow-md">
            MASQUERADE
            <br />
            PROTOCOL
          </h1>
          <p className="text-cyan-400/60 tracking-[0.2em] uppercase mt-2">
            Social Hacking Simulation
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 p-8 rounded-lg w-full max-w-md shadow-2xl z-10">
          {error && (
            <div className="bg-red-900/50 text-red-200 p-2 mb-4 rounded text-center text-sm border border-red-800">
              {error}
            </div>
          )}
          <input
            className="w-full bg-black/50 border border-slate-700 p-3 rounded mb-4 text-cyan-100 placeholder-slate-600 focus:border-cyan-500 outline-none transition-colors"
            placeholder="USER_ID"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <button
            onClick={createRoom}
            disabled={loading}
            className="w-full bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-500/50 text-cyan-100 p-4 rounded font-bold mb-4 flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Server size={20} /> INITIALIZE_SERVER
          </button>

          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              className="w-full sm:flex-1 bg-black/50 border border-slate-700 p-3 rounded text-cyan-100 placeholder-slate-600 focus:border-cyan-500 outline-none text-center tracking-widest uppercase"
              placeholder="ACCESS_CODE"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
            <button
              onClick={joinRoom}
              disabled={loading}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 border border-slate-600 px-6 py-3 rounded font-bold transition-colors text-slate-300"
            >
              CONNECT
            </button>
          </div>
          <button
            onClick={() => setShowGuide(true)}
            className="w-full text-sm text-slate-500 hover:text-cyan-400 flex items-center justify-center gap-2 py-2"
          >
            <BookOpen size={16} /> READ_MANUAL.txt
          </button>
        </div>
        <div className="absolute bottom-4 text-slate-600 text-xs text-center">
          Developed by <strong>RAWFID K SHUVO</strong>. Visit{" "}
          <a
            href="https://rawfidkshuvo.github.io/gamehub/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-500 underline hover:text-cyan-600"
          >
            GAMEHUB
          </a>{" "}
          for more games.
        </div>
      </div>
    );
  }

  if (view === "lobby" && gameState) {
    const isHost = gameState.hostId === user.uid;
    return (
      <div className="min-h-screen bg-slate-950 text-cyan-100 flex flex-col items-center justify-center p-6 relative font-mono">
        <FloatingBackground />
        <div className="z-10 w-full max-w-lg bg-slate-900/90 backdrop-blur p-8 rounded-lg border border-cyan-500/30 shadow-2xl">
          <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-cyan-500 flex items-center gap-2">
              <Terminal size={20} /> LOBBY:{" "}
              <span className="text-white">{roomId}</span>
            </h2>
            <button
              onClick={handleLeave}
              className="p-2 hover:bg-red-900/30 rounded text-red-400"
            >
              <LogOut size={16} />
            </button>
          </div>

          <div className="bg-black/40 rounded p-4 mb-8 border border-slate-800">
            <h3 className="text-slate-500 text-xs uppercase tracking-widest mb-4">
              Connected Clients ({gameState.players.length}/8)
            </h3>
            <div className="space-y-2">
              {gameState.players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-slate-800/50 p-3 rounded border border-slate-700"
                >
                  <span
                    className={`font-bold flex items-center gap-2 ${
                      p.id === user.uid ? "text-cyan-400" : "text-slate-400"
                    }`}
                  >
                    <User size={14} /> {p.name}
                    {p.id === gameState.hostId && (
                      <Crown size={14} className="text-yellow-500" />
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 text-xs flex items-center gap-1">
                      <CheckCircle size={12} /> ONLINE
                    </span>
                    {isHost && p.id !== user.uid && (
                      <button
                        onClick={() => kickPlayer(p.id)}
                        className="text-red-500 hover:text-red-400 p-1 hover:bg-red-900/30 rounded"
                        title="Kick Player"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isHost ? (
            <button
              onClick={startGame}
              disabled={gameState.players.length < 3}
              className={`w-full py-4 rounded font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                gameState.players.length >= 3
                  ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                  : "bg-slate-800 cursor-not-allowed text-slate-600"
              }`}
            >
              {gameState.players.length < 3
                ? "WAITING_FOR_USERS (Min 3)"
                : "EXECUTE_PROTOCOL"}
            </button>
          ) : (
            <div className="text-center text-cyan-500/60 animate-pulse italic">
              Waiting for Host execution...
            </div>
          )}
        </div>
        <GameLogo />
      </div>
    );
  }

  if (view === "game" && gameState) {
    const pIdx = gameState.players.findIndex((p) => p.id === user.uid);
    const me = gameState.players[pIdx];
    const isMyTurn = gameState.turnIndex === pIdx;
    const isHost = gameState.hostId === user.uid;

    // Determine card selection logic
    const selectedCard =
      selectedCardIdx !== null ? me.hand[selectedCardIdx] : null;

    // Trade needs target if not PING or PATCH
    const isPing = selectedCard === "PING";
    const isTrade = selectedCard === "INTEL" || selectedCard === "VIRUS";
    const needsTarget = isPing || isTrade;

    // Glitch Target logic
    const glitchNeedsTarget = glitchedAvatarNeedsTarget(me.avatar);

    // Check ready status for reset
    const allGuestsReady = gameState.players
      .filter((p) => p.id !== gameState.hostId)
      .every((p) => p.ready);

    return (
      <div className="min-h-screen bg-slate-950 text-cyan-100 overflow-hidden flex flex-col relative font-mono">
        <FloatingBackground />

        {/* MODALS */}
        {feedback && (
          <FeedbackOverlay
            type={feedback.type}
            message={feedback.message}
            subtext={feedback.subtext}
            icon={feedback.icon}
          />
        )}
        {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

        {inspectingItem && (
          <RoleInfoModal
            item={inspectingItem}
            canGlitch={inspectingItem.canGlitch}
            onClose={() => setInspectingItem(null)}
            onActivateGlitch={
              inspectingItem.canGlitch
                ? () => {
                    setInspectingItem(null);
                    setGlitchConfirm(true);
                  }
                : null
            }
          />
        )}

        {actionQueue.length > 0 && (
          <ActionResultModal
            data={actionQueue[0]}
            onClose={() => setActionQueue((prev) => prev.slice(1))}
          />
        )}

        {showScanSelection && (
          <ScanSelectionModal
            players={gameState.players.filter(
              (p) => p.id !== user.uid && !p.isEliminated
            )}
            onSelect={(targetId) => handlePassiveScan(targetId)}
            onSkip={() => handlePassiveScan(null)}
          />
        )}

        {/* TOP BAR */}
        <div className="h-14 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between px-4 z-50 backdrop-blur-md sticky top-0">
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-cyan-500" />
            <span className="font-bold tracking-wider hidden md:block text-cyan-100">
              MASQUERADE://{gameState.roomId}
            </span>
            <span className="text-xs text-slate-500">
              Deck: {gameState.deck.length} | Bin:{" "}
              {gameState.discardPile?.length || 0}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowGuide(true)}
              className="p-2 hover:bg-slate-800 rounded text-slate-400"
            >
              <BookOpen size={18} />
            </button>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="p-2 hover:bg-slate-800 rounded text-slate-400"
            >
              <History size={18} />
            </button>
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="p-2 hover:bg-red-900/30 rounded text-red-400"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* MAIN AREA */}
        <div className="flex-1 flex flex-col p-4 max-w-6xl mx-auto w-full relative z-10">
          {/* OPPONENTS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {gameState.players.map((p, i) => {
              if (p.id === user.uid) return null;
              const isActive = gameState.turnIndex === i;
              const isTarget =
                (isMyTurn && needsTarget) ||
                (glitchConfirm && glitchNeedsTarget);

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (isMyTurn && needsTarget) handlePlayCard(p.id);
                    if (glitchConfirm && glitchNeedsTarget)
                      activateGlitch(p.id);
                  }}
                  className={`
                    relative bg-slate-900/80 p-3 rounded border transition-all cursor-default
                    ${
                      isActive
                        ? "border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                        : "border-slate-700"
                    }
                    ${
                      isTarget
                        ? "ring-2 ring-red-500 cursor-pointer animate-pulse bg-red-900/10"
                        : ""
                    }
                    ${
                      p.isEliminated
                        ? "opacity-50 grayscale border-red-900"
                        : ""
                    }
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-xs truncate flex items-center gap-1">
                      {p.revealed && (
                        <AlertTriangle size={12} className="text-red-500" />
                      )}
                      {p.name}
                    </span>
                    <div className="flex items-center gap-1">
                      {p.ready && gameState.status === "finished" && (
                        <CheckCircle size={14} className="text-green-500" />
                      )}
                      {p.isEliminated && (
                        <Skull size={14} className="text-red-500" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    {/* Avatar Display - Click to Inspect */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectingItem(AVATARS[p.avatar]);
                      }}
                      className={`w-8 h-8 rounded flex items-center justify-center border cursor-pointer hover:scale-110 transition-transform ${
                        AVATARS[p.avatar].border
                      } ${AVATARS[p.avatar].bg}`}
                    >
                      {React.createElement(AVATARS[p.avatar].icon, {
                        size: 16,
                        className: AVATARS[p.avatar].color,
                      })}
                    </div>
                    {/* Directive (Hidden/Revealed) - Click to Inspect */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (p.revealed) {
                          setInspectingItem(DIRECTIVES[p.directive]);
                        } else {
                          setInspectingItem(HIDDEN_DIRECTIVE_INFO);
                        }
                      }}
                      className={`w-8 h-8 rounded flex items-center justify-center border cursor-pointer hover:scale-110 transition-transform ${
                        p.revealed
                          ? "border-red-500 bg-red-950"
                          : "border-slate-700 bg-slate-800"
                      }`}
                    >
                      {p.revealed ? (
                        React.createElement(DIRECTIVES[p.directive].icon, {
                          size: 16,
                          className: "text-red-400",
                        })
                      ) : (
                        <Lock size={14} className="text-slate-600" />
                      )}
                    </div>
                  </div>

                  <div className="flex gap-0.5 justify-center">
                    {p.hand.map((_, idx) => (
                      <div
                        key={idx}
                        className="w-2 h-4 bg-slate-700 rounded-sm"
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CENTER INFO */}
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            {gameState.status === "finished" ? (
              <div className="bg-slate-900/95 p-8 rounded-xl border border-cyan-500 shadow-2xl z-50 animate-in fade-in zoom-in">
                <Crown
                  size={48}
                  className="text-yellow-400 mx-auto mb-4 animate-bounce"
                />
                <h2 className="text-3xl font-bold text-white mb-2">
                  SIMULATION ENDED
                </h2>
                <div className="text-xl text-cyan-400 mb-6">
                  VICTOR:{" "}
                  {
                    gameState.players.find((p) => p.id === gameState.winnerId)
                      ?.name
                  }
                </div>

                {isHost ? (
                  <div className="space-y-2">
                    <button
                      onClick={returnToLobby}
                      disabled={!allGuestsReady}
                      className={`px-6 py-3 rounded font-bold flex items-center gap-2 mx-auto transition-all ${
                        allGuestsReady
                          ? "bg-cyan-700 hover:bg-cyan-600 text-white shadow-lg"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      <RotateCcw size={18} /> SYSTEM_RESET
                    </button>
                    {!allGuestsReady && (
                      <div className="text-xs text-yellow-500 animate-pulse">
                        Waiting for guests to ready up...
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={toggleReady}
                    disabled={me.ready}
                    className={`px-6 py-3 rounded font-bold flex items-center gap-2 mx-auto transition-all ${
                      me.ready
                        ? "bg-green-800 text-green-200 cursor-default"
                        : "bg-cyan-700 hover:bg-cyan-600 text-white shadow-lg animate-pulse"
                    }`}
                  >
                    {me.ready ? <CheckCircle size={18} /> : <Zap size={18} />}
                    {me.ready ? "WAITING FOR HOST" : "READY FOR REBOOT"}
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full max-w-md space-y-2 pointer-events-none">
                {gameState.logs
                  .filter(
                    (l) => l.viewerId === "all" || l.viewerId === user.uid
                  )
                  .slice(-3)
                  .reverse()
                  .map((l, i) => (
                    <div
                      key={l.id}
                      className={`text-xs p-2 rounded bg-black/60 border border-slate-800 ${
                        l.type === "danger"
                          ? "text-red-400 border-red-900"
                          : l.type === "glitch"
                          ? "text-fuchsia-300 border-fuchsia-900"
                          : "text-slate-400"
                      }`}
                      style={{ opacity: 1 - i * 0.3 }}
                    >
                      {`> ${l.text}`}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* PLAYER DASHBOARD */}
          <div className="mt-auto bg-slate-900/90 border-t border-cyan-900/30 p-4 -mx-4 md:rounded-t-2xl md:mx-0 backdrop-blur-md relative z-20">
            {/* Identity Bar */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                {/* My Avatar */}
                <div
                  onClick={() => {
                    // Show Inspection Modal for Self Avatar with Glitch Button
                    setInspectingItem({
                      ...AVATARS[me.avatar],
                      canGlitch: !me.glitchUsed && !me.isEliminated,
                    });
                  }}
                  className={`
                    flex items-center gap-3 p-2 rounded border cursor-pointer hover:bg-slate-800 transition-colors relative
                    ${AVATARS[me.avatar].border} ${AVATARS[me.avatar].bg}
                  `}
                >
                  {/* Pulse dot if glitch ready */}
                  {!me.glitchUsed && !me.isEliminated && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}

                  {React.createElement(AVATARS[me.avatar].icon, {
                    size: 32,
                    className: AVATARS[me.avatar].color,
                  })}
                  <div>
                    <div className="text-xs font-bold text-white uppercase">
                      {AVATARS[me.avatar].name}
                    </div>
                    <div className="text-[9px] text-slate-400 flex items-center gap-1">
                      {me.glitchUsed ? "Glitch Offline" : "Tap for Info"}
                      <HelpCircle size={8} />
                    </div>
                  </div>
                </div>

                {/* My Directive */}
                <div
                  onClick={() => {
                    setInspectingItem(DIRECTIVES[me.directive]);
                  }}
                  className={`
                  flex items-center gap-3 p-2 rounded border border-slate-700 bg-slate-800 relative cursor-pointer hover:bg-slate-700
                  ${me.revealed ? "border-red-500 bg-red-900/20" : ""}
                `}
                >
                  {React.createElement(DIRECTIVES[me.directive].icon, {
                    size: 32,
                    className: me.revealed
                      ? "text-red-400"
                      : "text-fuchsia-400",
                  })}
                  <div>
                    <div className="text-xs font-bold text-white uppercase">
                      {DIRECTIVES[me.directive].name}
                    </div>
                    <div className="text-[9px] text-slate-400 flex items-center gap-1">
                      {me.revealed ? "REVEALED" : "Tap for Info"}
                      <HelpCircle size={8} />
                    </div>
                  </div>
                </div>
              </div>

              {isMyTurn && (
                <div className="flex items-center gap-4">
                  <div className="text-xs text-green-400 font-bold animate-pulse">
                    AWAITING_INPUT...
                  </div>
                </div>
              )}
            </div>

            {/* Hand */}
            <div className="w-full overflow-x-auto pb-4 pt-6 px-4">
              <div className="flex gap-2 w-fit mx-auto">
                {me.hand.map((c, i) => {
                  const isSelected = selectedCardIdx === i;
                  return (
                    <div
                      key={i}
                      className={`transition-all duration-200 ${
                        isSelected ? "-translate-y-4" : "hover:-translate-y-2"
                      }`}
                    >
                      <CardDisplay
                        type={c}
                        onClick={() =>
                          isMyTurn ? setSelectedCardIdx(i) : null
                        }
                        highlight={isSelected}
                        disabled={!isMyTurn || me.isEliminated}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Bar */}
            {isMyTurn && selectedCard && (
              <div className="absolute top-0 left-0 right-0 -mt-16 flex justify-center gap-2">
                {needsTarget ? (
                  <div className="bg-yellow-600 text-black px-4 py-2 rounded font-bold animate-bounce shadow-lg border border-yellow-400 flex items-center gap-2">
                    {isTrade ? (
                      <ArrowLeftRight size={16} />
                    ) : (
                      <Wifi size={16} />
                    )}
                    Select Target to {isTrade ? "Trade" : "Ping"}
                  </div>
                ) : (
                  <button
                    onClick={() => handlePlayCard()}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded shadow-lg font-bold flex items-center gap-2"
                  >
                    <Upload size={16} /> Execute {PACKETS[selectedCard].name}
                  </button>
                )}
                <button
                  onClick={() => setSelectedCardIdx(null)}
                  className="bg-slate-700 hover:bg-slate-600 p-2 rounded"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* Glitch Confirmation Modal */}
            {glitchConfirm && (
              <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center rounded-t-2xl animate-in slide-in-from-bottom-10">
                <AlertTriangle
                  size={48}
                  className="text-red-500 mb-2 animate-pulse"
                />
                <h3 className="text-xl font-bold text-white mb-1">
                  WARNING: GLITCH DETECTED
                </h3>
                <p className="text-xs text-red-400 mb-4 max-w-xs text-center">
                  Activating your glitch will{" "}
                  <strong className="text-white">REVEAL YOUR DIRECTIVE</strong>{" "}
                  to all players. This cannot be undone.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setGlitchConfirm(false)}
                    className="px-4 py-2 rounded border border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    CANCEL
                  </button>
                  {glitchNeedsTarget ? (
                    <div className="px-4 py-2 rounded bg-fuchsia-900/50 text-fuchsia-200 border border-fuchsia-500 animate-pulse">
                      Select Target Player
                    </div>
                  ) : (
                    <button
                      onClick={() => activateGlitch()}
                      className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white font-bold shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                    >
                      CONFIRM EXECUTION
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LOGS MODAL */}
        {showLogs && (
          <div className="fixed inset-0 bg-black/90 z-[150] flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-lg w-full max-w-md h-[60vh] flex flex-col border border-slate-700">
              <div className="p-4 border-b border-slate-800 flex justify-between">
                <h3 className="text-white font-bold">System Logs</h3>
                <button onClick={() => setShowLogs(false)}>
                  <X className="text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
                {[...gameState.logs]
                  .filter(
                    (l) => l.viewerId === "all" || l.viewerId === user.uid
                  )
                  .reverse()
                  .map((l) => (
                    <div
                      key={l.id}
                      className={`p-2 border-l-2 ${
                        l.type === "danger"
                          ? "border-red-500 bg-red-900/10 text-red-300"
                          : l.type === "glitch"
                          ? "border-fuchsia-500 bg-fuchsia-900/10 text-fuchsia-300"
                          : "border-slate-600 text-slate-400"
                      }`}
                    >
                      <span className="opacity-50 mr-2">
                        [{new Date(l.id).toLocaleTimeString()}]
                      </span>
                      {l.text}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {showLeaveConfirm && (
          <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded border border-slate-700 p-6 text-center">
              <h3 className="text-white font-bold mb-4">
                Disconnect from Server?
              </h3>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="bg-slate-700 px-4 py-2 rounded text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLeave}
                  className="bg-red-600 px-4 py-2 rounded text-white"
                >
                  Disconnect
                </button>
                {isHost && (
                  <button
                    onClick={returnToLobby}
                    className="bg-orange-600 px-4 py-2 rounded text-white flex items-center gap-1"
                  >
                    <Home size={16} /> Lobby
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <GameLogo />
      </div>
    );
  }

  return null;
}

// Helper to determine if glitch needs target
function glitchedAvatarNeedsTarget(avatarId) {
  return ["GHOST", "ADMIN", "SEARCH_ENGINE"].includes(avatarId);
}

// Icon alias
const Upload = ArrowRight;
