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
  Radio,
  Syringe,
  Award,
  PlayCircle,
  SkipForward,
} from "lucide-react";

// ---------------------------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------------------------
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
    // NERF: Replaced "Immune" with "Tolerance".
    // Immunity in a 3-player game breaks the math. Tolerance creates a "Tank" role.
    id: "FIREWALL",
    name: "Firewall",
    icon: Shield,
    color: "text-orange-500",
    bg: "bg-orange-950/50",
    border: "border-orange-600",
    passive: "Higher Tolerance: You are eliminated at 4 Viruses instead of 3.",
    glitch:
      "Purge: Discard all VIRUS cards in your hand and draw that many new cards.",
  },
  SEARCH_ENGINE: {
    // BUFF: Added "Steal". Information alone isn't enough in small groups.
    id: "SEARCH_ENGINE",
    name: "Search Engine",
    icon: Search,
    color: "text-blue-400",
    bg: "bg-blue-950/50",
    border: "border-blue-600",
    passive: "Scan: Peek at 1 random card from a player's hand once per turn.",
    glitch:
      "Index & Extract: Look at target's hand and steal 1 card of your choice.",
  },
  MINER: {
    // TWEAK: Draw 3 instead of 5 for Glitch.
    // Drawing 5 cards in a 3-player game might deck out the game instantly.
    id: "MINER",
    name: "Data Miner",
    icon: HardDrive,
    color: "text-emerald-400",
    bg: "bg-emerald-950/50",
    border: "border-emerald-600",
    passive: "Draw 2 cards instead of 1 at start of turn.",
    glitch: "Jackpot: Draw 3 cards immediately.",
  },
  GHOST: {
    // UNCHANGED: Excellent chaos role.
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
    // UNCHANGED: The "Police" role. Necessary to stop hoarders.
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
    // UNCHANGED: 5 Intel is perfect tension with a 5-card hand limit.
    id: "COLLECTOR",
    name: "The Collector",
    desc: "Win if you have 5 INTEL cards in hand.",
    icon: Database,
    color: "text-cyan-400",
  },
  SABOTEUR: {
    // UNCHANGED: Hard mode. High risk/reward.
    id: "SABOTEUR",
    name: "The Saboteur",
    desc: "Win if you hold at least 1 of each card type: INTEL, VIRUS, PING, PATCH.",
    icon: Bug,
    color: "text-lime-400",
  },
  ANARCHIST: {
    id: "ANARCHIST",
    name: "The Anarchist",
    // CHANGED: Requirement increased to "2 Viruses" per victim
    desc: "Win if at least 2 other living players are CRITICAL (holding 2+ VIRUS cards).",
    icon: AlertTriangle,
    color: "text-yellow-400",
  },
  SURVIVOR: {
    // CHANGED: Lower threshold. In small games, 2 crashes usually ends the game anyway.
    id: "SURVIVOR",
    name: "The Survivor",
    desc: "Win if you survive 1 System Crash (Global), or be the last player standing.",
    icon: Shield,
    color: "text-orange-400",
  },
  CORRUPTOR: {
    // UNCHANGED: 4 Viruses is a death sentence if you fail, but instant win. Good balance.
    id: "CORRUPTOR",
    name: "The Corruptor",
    desc: "Win if you hold 4 VIRUS cards. (Overrides Elimination).",
    icon: Skull,
    color: "text-fuchsia-400",
  },
  HACKER: {
    // CHANGED: 3 Pings. 4 is statistically too hard with only 6 in the deck.
    id: "HACKER",
    name: "The Hacker",
    desc: "Win if you use the PING card 3 times.",
    icon: Radio,
    color: "text-indigo-400",
  },
  ANTIVIRUS: {
    // CHANGED: 2 Patches. 3 is too rare.
    id: "ANTIVIRUS",
    name: "Antivirus",
    desc: "Win if you successfully use a PATCH to remove a VIRUS 2 times.",
    icon: Syringe,
    color: "text-teal-400",
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
  ...Array(18).fill("INTEL"), // +3 from original
  ...Array(10).fill("VIRUS"), // Constant threat
  ...Array(6).fill("PING"), // +1 (Better odds for Hacker)
  ...Array(6).fill("PATCH"), // +1 (Better odds for Antivirus)
];
// Total: 40 Cards

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

const StealSelectionModal = ({ targetPlayer, onSelect, onCancel }) => (
  <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
    <div className="bg-slate-900 border-2 border-fuchsia-500 p-6 rounded-xl max-w-lg w-full shadow-[0_0_30px_rgba(217,70,239,0.3)] text-center relative">
      <h3 className="text-xl font-black text-fuchsia-400 mb-2 uppercase tracking-widest flex items-center justify-center gap-2">
        <Database size={24} /> INDEX & EXTRACT
      </h3>
      <p className="text-slate-300 text-sm mb-6">
        Viewing <strong>{targetPlayer.name}</strong>'s database. <br />
        <span className="text-white font-bold">
          Select 1 packet to download (steal).
        </span>
      </p>

      <div className="flex justify-center flex-wrap gap-4 mb-6">
        {targetPlayer.hand.map((card, idx) => (
          <div
            key={idx}
            className="hover:scale-110 transition-transform cursor-pointer relative group"
            onClick={() => onSelect(card, idx)} // Pass card type and index
          >
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-fuchsia-600 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              STEAL THIS
            </div>
            <CardDisplay type={card} />
          </div>
        ))}
      </div>

      <button
        onClick={onCancel}
        className="text-slate-500 hover:text-white text-xs underline"
      >
        Cancel Glitch
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
      {/* Header */}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 text-slate-300">
        {/* 1. OBJECTIVE */}
        <section>
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2 border-b border-slate-700 pb-2">
            <Crown size={20} className="text-yellow-400" /> Objective
          </h3>
          <p className="mb-4">
            You are a rogue AI. Collect{" "}
            <strong className="text-yellow-400">Golden Chips</strong> by winning
            rounds. The first player to collect{" "}
            <strong className="text-yellow-400">3 Chips</strong> becomes the
            Grand Champion.
          </p>
        </section>

        {/* 2. AVATARS (Public Roles) */}
        <section>
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2 border-b border-slate-700 pb-2">
            <User size={20} className="text-cyan-400" /> Public Avatars (Roles)
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Every player is assigned a public role visible to everyone. These
            grant passive bonuses and powerful "Glitch" ultimates.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(AVATARS).map((av) => (
              <div
                key={av.id}
                className={`p-3 rounded border border-l-4 bg-slate-800/50 ${
                  av.border
                } border-l-[${av.color.replace("text-", "")}]`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {React.createElement(av.icon, {
                    size: 20,
                    className: av.color,
                  })}
                  <strong className={`uppercase ${av.color}`}>{av.name}</strong>
                </div>
                <ul className="text-xs space-y-1">
                  <li className="flex gap-2">
                    <span className="text-cyan-500 font-bold min-w-[50px]">
                      PASSIVE:
                    </span>
                    <span className="text-slate-300">{av.passive}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-fuchsia-500 font-bold min-w-[50px]">
                      GLITCH:
                    </span>
                    <span className="text-slate-300">{av.glitch}</span>
                  </li>
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 3. DIRECTIVES (Hidden Agenda) */}
        <section>
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2 border-b border-slate-700 pb-2">
            <Lock size={20} className="text-fuchsia-400" /> Secret Directives
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Your true win condition. Hidden from others until you activate your
            Glitch.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.values(DIRECTIVES).map((dir) => (
              <div
                key={dir.id}
                className="p-3 rounded border border-l-4 border-l-fuchsia-500 border-slate-700 bg-slate-800/50 flex flex-col justify-between"
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

        {/* 4. DATA PACKETS (Cards) */}
        <section>
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2 border-b border-slate-700 pb-2">
            <Database size={20} className="text-green-400" /> Data Packets
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {Object.values(PACKETS).map((card) => (
              <div
                key={card.id}
                className="bg-slate-950 p-3 rounded border border-slate-800 flex flex-col items-center text-center"
              >
                <card.icon size={24} className={`mb-2 ${card.color}`} />
                <div className={`font-bold text-sm mb-1 ${card.color}`}>
                  {card.name}
                </div>
                <div className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-400 mb-2 uppercase tracking-wider">
                  {card.type}
                </div>
                <p className="text-xs text-slate-400">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. MECHANICS */}
        <section>
          <h3 className="text-xl font-bold text-white mb-3 border-b border-slate-700 pb-2">
            Core Mechanics
          </h3>
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-400">
            <li>
              <strong className="text-white">Crash:</strong> Holding 3 Viruses
              causes Immediate Elimination.
            </li>
            <li>
              <strong className="text-white">Glitch:</strong> A one-time
              ultimate ability. Activating it reveals your Secret Directive to
              everyone.
            </li>
            <li>
              <strong className="text-white">Trade:</strong> Select an INTEL or
              VIRUS card, then select a target. You give them your card, and
              blindly take one random card from their hand.
            </li>
            <li>
              <strong className="text-white">Hand Limit:</strong> 5 Cards (7 for
              Admin). You must discard or skip turn if full.
            </li>
          </ul>
        </section>
      </div>

      {/* Footer */}
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

  // Add this with other state variables
  const [showStealModal, setShowStealModal] = useState(false);
  const [stealTargetId, setStealTargetId] = useState(null);

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

  // --- IMMEDIATE VIRUS CHECK ---
  // Scans ALL players to see if anyone has 3+ Viruses and eliminates them immediately.
  // RETURNS: Number of players crashed (to update global crashCount)
  const processVirusOverload = (players, discardPile, logs) => {
    let crashCount = 0;
    players.forEach((p) => {
      if (p.isEliminated) return;
      if (p.directive === "CORRUPTOR") return; // Corruptor is immune

      // LOGIC CHANGE: Firewall Tolerance
      let limit = 3;
      if (p.avatar === "FIREWALL") limit = 4;

      const virusCount = p.hand.filter((c) => c === "VIRUS").length;

      if (virusCount >= limit) {
        p.isEliminated = true;
        discardPile.push(...p.hand);
        p.hand = [];
        crashCount++;
        // ... logs and feedback ...
      }
    });
    return crashCount;
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
          pingCount: 0,
          antivirusCount: 0,
          chips: 0, // Golden Chips
        },
      ],
      deck: [],
      discardPile: [],
      turnIndex: 0,
      crashCount: 0,
      roundCount: 1,
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
    if (data.players.length >= 6) {
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
          pingCount: 0,
          antivirusCount: 0,
          chips: 0,
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
    // Use 'let' so we can modify the deck inside the loop
    let deck = shuffle([...DECK_TEMPLATE]);

    const players = gameState.players.map((p, i) => {
      let hand = [];
      let validHand = false;

      // SAFETY LOOP: Keep redrawing until hand has < 3 Viruses
      while (!validHand) {
        // Draw 3 cards
        hand = [deck.pop(), deck.pop(), deck.pop()];

        const virusCount = hand.filter((c) => c === "VIRUS").length;

        if (virusCount < 3) {
          validHand = true; // Hand is safe
        } else {
          // Bad hand (Instant Death)! Return cards to deck and shuffle
          deck.push(...hand);
          deck = shuffle(deck);
          hand = []; // Reset for next attempt
        }
      }

      return {
        ...p,
        avatar: avatarKeys[i % avatarKeys.length],
        directive: directiveKeys[i % directiveKeys.length],
        hand,
        ready: false,
        passiveUsed: false,
        pingCount: 0,
        antivirusCount: 0,
        // chips are preserved
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
        crashCount: 0,
        logs: [
          {
            text: `Round ${
              gameState.roundCount || 1
            } Initialized. Safety protocols active.`,
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

  // FULL RESET (Used only after Grand Champion is crowned)
  const resetGameSession = async () => {
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
      pingCount: 0,
      antivirusCount: 0,
      chips: 0, // Reset Chips
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
        lastEvent: null,
        crashCount: 0,
        roundCount: 1, // Reset Round
      }
    );
    setShowLeaveConfirm(false);
  };

  // NEXT ROUND (Preserves chips, increments round)
  const startNextRound = async () => {
    if (gameState.hostId !== user.uid) return;

    // 1. Prepare new game state
    const avatarKeys = shuffle(Object.keys(AVATARS));
    const directiveKeys = shuffle(Object.keys(DIRECTIVES));
    let deck = shuffle([...DECK_TEMPLATE]);

    // 2. Map players (Keep IDs, Names, Chips; Reset everything else)
    const players = gameState.players.map((p, i) => {
      let hand = [];
      let validHand = false;

      // SAFETY LOOP: Keep redrawing until hand has < 3 Viruses
      while (!validHand) {
        hand = [deck.pop(), deck.pop(), deck.pop()];
        const virusCount = hand.filter((c) => c === "VIRUS").length;

        if (virusCount < 3) {
          validHand = true;
        } else {
          // Bad hand! Return to bottom and shuffle
          deck.push(...hand);
          deck = shuffle(deck);
          hand = [];
        }
      }

      return {
        ...p,
        avatar: avatarKeys[i % avatarKeys.length],
        directive: directiveKeys[i % directiveKeys.length],
        hand,
        ready: false,
        passiveUsed: false,
        pingCount: 0,
        antivirusCount: 0,
        isEliminated: false,
        revealed: false,
        glitchUsed: false,
        // chips are preserved
      };
    });

    // 3. Update Firestore
    await updateDoc(
      doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
      {
        status: "playing",
        players,
        deck,
        discardPile: [],
        turnIndex: 0,
        crashCount: 0,
        winnerId: null,
        roundCount: increment(1),
        logs: [
          {
            text: `Round ${
              gameState.roundCount + 1
            } Initialized. Safety protocols active.`,
            type: "neutral",
            id: Date.now(),
            viewerId: "all",
          },
        ],
      }
    );
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

  // UPDATED FUNCTION SIGNATURE: Accepting the 3rd argument 'newCrashCount'
  const checkWinConditions = async (players, logs, newCrashCount = 0) => {
    const living = players.filter((pl) => !pl.isEliminated);

    // 1. UNIVERSAL CONDITION: Last Man Standing
    if (living.length === 1) {
      return living[0].id;
    }

    // CALCULATE REAL TOTAL: Database Value + Just Happened Value
    const currentDbCrashes = gameState.crashCount || 0;
    const totalCrashes = currentDbCrashes + newCrashCount;

    // 2. Directive Specific Conditions
    for (const p of players) {
      if (p.isEliminated) continue;

      const d = p.directive; // 'd' for Directive
      const h = p.hand;
      let won = false;

      if (d === "COLLECTOR") {
        if (h.filter((c) => c === "INTEL").length >= 5) won = true;
      } else if (d === "CORRUPTOR") {
        if (h.filter((c) => c === "VIRUS").length >= 4) won = true;
      } else if (d === "ANARCHIST") {
        // FIXED LOGIC: 2 other players must have 2+ Viruses
        const criticalPlayers = living.filter(
          (pl) =>
            pl.id !== p.id && pl.hand.filter((c) => c === "VIRUS").length >= 2
        );
        if (criticalPlayers.length >= 2) won = true;
      } else if (d === "SABOTEUR") {
        if (
          h.includes("INTEL") &&
          h.includes("VIRUS") &&
          h.includes("PING") &&
          h.includes("PATCH")
        )
          won = true;
      } else if (d === "SURVIVOR") {
        // FIXED LOGIC: Use the Calculated Total (Future Sight)
        if (totalCrashes >= 1) won = true;
      } else if (d === "HACKER") {
        if ((p.pingCount || 0) >= 3) won = true;
      } else if (d === "ANTIVIRUS") {
        if ((p.antivirusCount || 0) >= 2) won = true;
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
    let discardedCards = [];

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

    if (discardedCards.length > 0) {
      queueAction({
        title: "MEMORY OVERFLOW",
        message: `Hand limit exceeded. Auto-purged data:`,
        cards: discardedCards.map((c) => ({ type: c, label: "Purged" })),
      });
    }

    // 2. IMMEDIATE WIN CHECK (Priority over Death)
    let winnerId = await checkWinConditions(updatedPlayers, logs);
    if (winnerId) {
      const winnerIdx = updatedPlayers.findIndex((p) => p.id === winnerId);
      updatedPlayers[winnerIdx].chips =
        (updatedPlayers[winnerIdx].chips || 0) + 1;

      // --- NEW CODE START ---
      // Reveal everyone's directive
      updatedPlayers.forEach((p) => {
        p.revealed = true;
      });
      // --- NEW CODE END ---

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
          text: `Round Winner Identified: ${updatedPlayers[winnerIdx].name}. Chip awarded.`,
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

    // 4. CHAIN CRASH LOOP
    // We loop until we find a player who draws cards and SURVIVES
    // or everyone is dead (game over)
    let activePlayerFound = false;
    let nextIdx = (gameState.turnIndex + 1) % updatedPlayers.length;
    let globalCrashAccumulator = 0;

    // Safety brake to prevent infinite loops
    let loopCount = 0;
    const maxLoops = updatedPlayers.length * 2;

    while (!activePlayerFound && loopCount < maxLoops) {
      loopCount++;

      // A. Skip already eliminated players
      let innerLoop = 0;
      while (
        updatedPlayers[nextIdx].isEliminated &&
        innerLoop < updatedPlayers.length
      ) {
        nextIdx = (nextIdx + 1) % updatedPlayers.length;
        innerLoop++;
      }

      const nextP = updatedPlayers[nextIdx];
      // Reset passive for the potential new player
      nextP.passiveUsed = false;

      // If everyone is dead, break (Win check will catch it later)
      if (innerLoop >= updatedPlayers.length) break;

      // B. Draw Phase
      let drawCount = 1;
      if (nextP.avatar === "MINER") drawCount = 2;

      for (let i = 0; i < drawCount; i++) {
        if (deck.length === 0) {
          if (discardPile.length > 0) {
            deck = shuffle([...discardPile]);
            discardPile = [];
            logs.push({
              text: "Deck rebooted.",
              type: "neutral",
              id: Date.now() + 3 + loopCount,
              viewerId: "all",
            });
          } else {
            break;
          }
        }
        if (deck.length > 0) nextP.hand.push(deck.pop());
      }

      // C. Immediate Virus Check
      const crashedCount = processVirusOverload(
        updatedPlayers,
        discardPile,
        logs
      );
      globalCrashAccumulator += crashedCount;

      // D. Did they survive?
      if (!nextP.isEliminated) {
        activePlayerFound = true; // Loop ends, this player starts turn
      } else {
        // Player crashed immediately. Loop continues to NEXT person.
        logs.push({
          text: `${nextP.name} crashed immediately upon receiving data. Passing control...`,
          type: "danger",
          id: Date.now() + 5 + loopCount,
          viewerId: "all",
        });
      }
    }

    // 7. IMMEDIATE WIN CHECK (After Drawing/Crashing Chain)
    winnerId = await checkWinConditions(
      updatedPlayers,
      logs,
      globalCrashAccumulator
    );
    if (winnerId) {
      const winnerIdx = updatedPlayers.findIndex((p) => p.id === winnerId);
      updatedPlayers[winnerIdx].chips =
        (updatedPlayers[winnerIdx].chips || 0) + 1;

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
          text: `Round Winner: ${updatedPlayers[winnerIdx].name}.`,
          type: "success",
          id: Date.now() + 4,
          viewerId: "all",
        }),
        crashCount: increment(globalCrashAccumulator),
      };
      if (eventData) updates.lastEvent = eventData;

      await updateDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
        updates
      );
      return;
    }

    logs.push({
      text: `Processing cycle: ${updatedPlayers[nextIdx].name}`,
      type: "neutral",
      id: Date.now() + 10,
      viewerId: "all",
    });

    const updates = {
      players: updatedPlayers,
      deck,
      discardPile,
      turnIndex: nextIdx, // Ensure turn index is set to the SURVIVOR of the loop
      logs: arrayUnion(...logs),
      crashCount: increment(globalCrashAccumulator),
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
  };

  const handleStealSelection = async (cardType, cardIndex) => {
    if (!roomId || !stealTargetId) return;

    const pIdx = gameState.players.findIndex((p) => p.id === user.uid);
    const me = gameState.players[pIdx];
    const tIdx = gameState.players.findIndex((p) => p.id === stealTargetId);
    const target = gameState.players[tIdx];

    // 1. Close Modal
    setShowStealModal(false);
    setStealTargetId(null);

    // 2. Prepare Data for Next Turn
    const players = JSON.parse(JSON.stringify(gameState.players));
    const logs = [];

    // 3. Mark Glitch as Used & Reveal Directive
    players[pIdx].glitchUsed = true;
    players[pIdx].revealed = true;

    // 4. Perform the Specific Steal
    // Remove specific card from target at the specific index
    players[tIdx].hand.splice(cardIndex, 1);
    // Add that card to my hand
    players[pIdx].hand.push(cardType);

    // 5. Logs & Feedback
    logs.push({
      text: `⚠️ GLITCH: ${me.name} Indexed ${target.name} and extracted a ${cardType}.`,
      type: "glitch",
      id: Date.now(),
      viewerId: "all",
    });

    triggerFeedback(
      "glitch",
      "DOWNLOAD COMPLETE",
      `Acquired ${cardType}`,
      Search
    );

    // 6. Check Win Conditions & Save (Standard Next Turn Logic)
    // We reuse the existing logic flow here to ensure crashes/wins are checked

    let discardPile = [...gameState.discardPile];
    let deck = [...gameState.deck];

    // --- IMMEDIATE CRASH CHECK ---
    const crashedCount = processVirusOverload(players, discardPile, logs);

    // --- IMMEDIATE WIN CHECK ---
    const winnerId = await checkWinConditions(players, logs, crashedCount);

    if (winnerId) {
      // ... (Copy your standard win update logic here from activateGlitch) ...
      const winnerIdx = players.findIndex((p) => p.id === winnerId);
      players[winnerIdx].chips = (players[winnerIdx].chips || 0) + 1;
      players.forEach((p) => {
        p.revealed = true;
      });

      const updates = {
        players: players.map((p) => ({ ...p, ready: false })),
        status: "finished",
        winnerId,
        discardPile,
        logs: arrayUnion(...logs),
        crashCount: increment(crashedCount),
      };
      await updateDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
        updates
      );
      return;
    }

    if (crashedCount > 0) {
      await updateDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
        { crashCount: increment(crashedCount) }
      );
    }

    // Proceed to next turn
    await nextTurn(players, deck, discardPile, logs);
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

        // INCREMENT ANTIVIRUS COUNT
        players[pIdx].antivirusCount = (players[pIdx].antivirusCount || 0) + 1;

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

      // INCREMENT PING COUNT FOR HACKER
      players[pIdx].pingCount = (players[pIdx].pingCount || 0) + 1;

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

    // --- IMMEDIATE CRASH CHECK (AFTER ACTION) ---
    // Note: Pings/Patch don't cause crashes, but Trades do.
    const crashedCount = processVirusOverload(players, discardPile, logs);

    setSelectedCardIdx(null);

    // CHECK WIN IMMEDIATELY AFTER ACTION
    const winnerId = await checkWinConditions(players, logs, crashedCount);
    if (winnerId) {
      const winnerIdx = players.findIndex((p) => p.id === winnerId);
      players[winnerIdx].chips = (players[winnerIdx].chips || 0) + 1;

      // --- NEW CODE START ---
      // Reveal everyone's directive
      players.forEach((p) => {
        p.revealed = true;
      });
      // --- NEW CODE END ---

      const resetReadyPlayers = players.map((p) => ({ ...p, ready: false }));
      const updates = {
        players: resetReadyPlayers,
        status: "finished",
        winnerId,
        discardPile,
        logs: arrayUnion(...logs, {
          text: `Round Winner: ${players[winnerIdx].name}.`,
          type: "success",
          id: Date.now(),
          viewerId: "all",
        }),
        crashCount: increment(crashedCount),
      };
      if (eventData) updates.lastEvent = eventData;

      await updateDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
        updates
      );
      return;
    }

    // If crashes happened, we need to update the global count before proceeding
    if (crashedCount > 0) {
      await updateDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
        { crashCount: increment(crashedCount) }
      );
    }

    await nextTurn(players, deck, discardPile, logs, eventData);
  };

  // --- SKIP TURN LOGIC ---
  const handleSkipTurn = async () => {
    if (!roomId || !gameState) return;

    const pIdx = gameState.players.findIndex((p) => p.id === user.uid);
    const me = gameState.players[pIdx];

    // 1. Check Hand Limit
    const limit = me.avatar === "ADMIN" ? 7 : 5;
    if (me.hand.length > limit) {
      triggerFeedback(
        "failure",
        "MEMORY OVERFLOW",
        `Cannot skip. Hand limit (${limit}) exceeded.`,
        AlertTriangle
      );
      return;
    }

    // 2. Prepare Logs
    const logs = [
      {
        text: `${me.name} skipped their turn.`,
        type: "neutral",
        id: Date.now(),
        viewerId: "all",
      },
    ];

    // 3. Pass turn to next player (reuses existing nextTurn logic)
    // We pass the current state, nextTurn handles the incrementing and drawing for the next person
    await nextTurn(
      gameState.players,
      gameState.deck,
      gameState.discardPile,
      logs
    );
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
      // --- NEW LOGIC START ---
      // Instead of executing immediately, open the selection UI
      setStealTargetId(targetId);
      setShowStealModal(true);
      setGlitchConfirm(false); // Close the confirmation modal
      return; // STOP execution here. Wait for modal selection.
      // --- NEW LOGIC END ---
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

    // --- IMMEDIATE CRASH CHECK (AFTER GLITCH) ---
    const crashedCount = processVirusOverload(players, discardPile, logs);

    // CHECK WIN IMMEDIATELY AFTER GLITCH
    const winnerId = await checkWinConditions(players, logs, crashedCount);
    if (winnerId) {
      const winnerIdx = players.findIndex((p) => p.id === winnerId);
      players[winnerIdx].chips = (players[winnerIdx].chips || 0) + 1;

      // --- NEW CODE START ---
      // Reveal everyone's directive
      players.forEach((p) => {
        p.revealed = true;
      });
      // --- NEW CODE END ---

      const resetReadyPlayers = players.map((p) => ({ ...p, ready: false }));
      const updates = {
        players: resetReadyPlayers,
        status: "finished",
        winnerId,
        discardPile,
        logs: arrayUnion(...logs, {
          text: `Round Winner: ${players[winnerIdx].name}.`,
          type: "success",
          id: Date.now(),
          viewerId: "all",
        }),
        crashCount: increment(crashedCount),
      };
      if (eventData) updates.lastEvent = eventData;

      await updateDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
        updates
      );
      return;
    }

    // Update global crash count if necessary
    if (crashedCount > 0) {
      await updateDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
        { crashCount: increment(crashedCount) }
      );
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
            The AI is glitched. Wait for replacement hardware.
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
              Connected Clients ({gameState.players.length}/6)
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
                    {/* CHIP DISPLAY */}
                    {(p.chips || 0) > 0 && (
                      <div className="flex items-center gap-1 bg-yellow-900/40 px-2 py-0.5 rounded border border-yellow-700/50">
                        <Award size={12} className="text-yellow-400" />
                        <span className="text-xs text-yellow-200 font-bold">
                          {p.chips}
                        </span>
                      </div>
                    )}
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

    const winner = gameState.players.find((p) => p.id === gameState.winnerId);
    const gameWinner = gameState.players.find((p) => (p.chips || 0) >= 3);

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

        {/* Add this inside the main return statement */}
        {showStealModal && stealTargetId && (
          <StealSelectionModal
            targetPlayer={gameState.players.find((p) => p.id === stealTargetId)}
            onSelect={handleStealSelection}
            onCancel={() => {
              setShowStealModal(false);
              setStealTargetId(null);
            }}
          />
        )}

        {/* TOP BAR */}
        <div className="h-14 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between px-4 z-50 backdrop-blur-md sticky top-0">
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-cyan-500" />
            <span className="font-bold tracking-wider hidden md:block text-cyan-100">
              ROUND {gameState.roundCount || 1}
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
              className={`p-2 rounded-full ${
                showLogs
                  ? "bg-cyan-900 text-cyan-400"
                  : "text-gray-400 hover:bg-gray-800"
              }`}
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
                      {/* Chips Indicator */}
                      {(p.chips || 0) > 0 && (
                        <div
                          className="flex items-center gap-0.5"
                          title={`${p.chips} Chips`}
                        >
                          {[...Array(p.chips)].map((_, i) => (
                            <Award
                              key={i}
                              size={10}
                              className="text-yellow-400 fill-yellow-900"
                            />
                          ))}
                        </div>
                      )}
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
                        // FIX 1: Allow inspection if revealed OR game is finished
                        if (p.revealed || gameState.status === "finished") {
                          setInspectingItem(DIRECTIVES[p.directive]);
                        } else {
                          setInspectingItem(HIDDEN_DIRECTIVE_INFO);
                        }
                      }}
                      className={`w-8 h-8 rounded flex items-center justify-center border cursor-pointer hover:scale-110 transition-transform ${
                        // FIX 2: Change border color if revealed OR game is finished
                        p.revealed || gameState.status === "finished"
                          ? "border-red-500 bg-red-950"
                          : "border-slate-700 bg-slate-800"
                      }`}
                    >
                      {/* FIX 3: Show Icon if revealed OR game is finished */}
                      {p.revealed || gameState.status === "finished" ? (
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
              <div className="bg-slate-900/95 p-8 rounded-xl border border-cyan-500 shadow-2xl z-50 animate-in fade-in zoom-in w-full max-w-md">
                {gameWinner ? (
                  <>
                    <Crown
                      size={64}
                      className="text-yellow-400 mx-auto mb-4 animate-bounce"
                    />
                    <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 mb-2">
                      GRAND CHAMPION
                    </h2>
                    <div className="text-2xl text-white mb-6">
                      {gameWinner.name}
                    </div>
                    <div className="text-sm text-yellow-500/80 mb-6 uppercase tracking-widest">
                      Collected 3 Golden Chips
                    </div>
                  </>
                ) : (
                  <>
                    <Award
                      size={48}
                      className="text-cyan-400 mx-auto mb-4 animate-bounce"
                    />
                    <h2 className="text-3xl font-bold text-white mb-2">
                      ROUND {gameState.roundCount} COMPLETE
                    </h2>
                    <div className="text-xl text-cyan-400 mb-6">
                      WINNER: {winner?.name}
                    </div>
                    <div className="text-sm text-slate-400 mb-6">
                      {winner?.name} receives a Golden Chip. ({winner?.chips}
                      /3)
                    </div>
                  </>
                )}

                {isHost ? (
                  <div className="space-y-2">
                    {gameWinner ? (
                      <button
                        onClick={resetGameSession}
                        className="px-6 py-3 rounded font-bold bg-red-700 hover:bg-red-600 text-white shadow-lg mx-auto flex items-center gap-2"
                      >
                        <LogOut size={18} /> FULL RESET TO LOBBY
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={startNextRound}
                          disabled={!allGuestsReady}
                          className={`px-6 py-3 rounded font-bold flex items-center gap-2 mx-auto transition-all ${
                            allGuestsReady
                              ? "bg-cyan-700 hover:bg-cyan-600 text-white shadow-lg"
                              : "bg-slate-800 text-slate-500 cursor-not-allowed"
                          }`}
                        >
                          <PlayCircle size={18} /> START ROUND{" "}
                          {(gameState.roundCount || 0) + 1}
                        </button>
                        {!allGuestsReady && (
                          <div className="text-xs text-yellow-500 animate-pulse">
                            Waiting for players...
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  !gameWinner && (
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
                      {me.ready ? "WAITING FOR HOST" : "READY FOR NEXT ROUND"}
                    </button>
                  )
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
                          ? "border-red-500 bg-red-900/10 text-red-300"
                          : l.type === "glitch"
                          ? "border-fuchsia-500 bg-fuchsia-900/10 text-fuchsia-300"
                          : "border-slate-600 text-slate-400"
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
                  {/* --- NEW: PROGRESS COUNTERS --- */}
                  {me.directive === "HACKER" && (
                    <div className="absolute -top-2 -right-2 bg-indigo-900 text-indigo-100 text-[10px] px-2 py-0.5 rounded-full border border-indigo-500 font-bold shadow-lg z-10 flex items-center gap-1">
                      <Wifi size={10} /> {me.pingCount || 0}/3
                    </div>
                  )}
                  {me.directive === "ANTIVIRUS" && (
                    <div className="absolute -top-2 -right-2 bg-teal-900 text-teal-100 text-[10px] px-2 py-0.5 rounded-full border border-teal-500 font-bold shadow-lg z-10 flex items-center gap-1">
                      <Syringe size={10} /> {me.antivirusCount || 0}/2
                    </div>
                  )}
                  {/* ----------------------------- */}

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

                {/* Chips */}
                {(me.chips || 0) > 0 && (
                  <div className="flex items-center gap-1 bg-yellow-900/30 px-3 py-1 rounded border border-yellow-600/50">
                    {[...Array(me.chips)].map((_, i) => (
                      <Award
                        key={i}
                        size={16}
                        className="text-yellow-400 fill-yellow-900"
                      />
                    ))}
                  </div>
                )}
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
            {/* Action Bar (Updated) */}
            {isMyTurn && (
              <div className="absolute top-0 left-0 right-0 -mt-16 flex justify-center gap-2 pointer-events-none">
                <div className="pointer-events-auto flex gap-2">
                  {selectedCard ? (
                    /* CARD SELECTED STATE */
                    <>
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
                          className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded shadow-lg font-bold flex items-center gap-2 transition-all hover:scale-105"
                        >
                          <Upload size={16} /> Execute{" "}
                          {PACKETS[selectedCard].name}
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedCardIdx(null)}
                        className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-white shadow-lg transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </>
                  ) : (
                    /* NO CARD SELECTED - SHOW SKIP */
                    (() => {
                      const limit = me.avatar === "ADMIN" ? 7 : 5;
                      const canSkip = me.hand.length <= limit;
                      return (
                        <button
                          onClick={handleSkipTurn}
                          disabled={!canSkip}
                          className={`
                            px-6 py-2 rounded shadow-lg font-bold flex items-center gap-2 transition-all
                            ${
                              canSkip
                                ? "bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-500"
                                : "bg-red-900/50 text-red-400 border border-red-800 cursor-not-allowed opacity-80"
                            }
                          `}
                        >
                          {canSkip ? (
                            <>
                              <SkipForward size={16} /> SKIP TURN
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={16} /> HAND LIMIT EXCEEDED
                            </>
                          )}
                        </button>
                      );
                    })()
                  )}
                </div>
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
          <div className="fixed top-16 right-4 w-64 max-h-60 bg-gray-900/95 border border-gray-700 rounded-xl z-[155] overflow-y-auto p-2 shadow-2xl">
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
                    onClick={resetGameSession}
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
