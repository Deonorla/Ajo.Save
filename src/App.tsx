import React, { useState, useEffect } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { 
  Eye, Shield, Coins, Users, Zap, Globe, 
  ArrowRight, Sparkles, TrendingUp, Heart,
  Play, CheckCircle, Star, MessageCircle,
  Twitter, Instagram, Music, Gamepad2,
  Target, Database, Cpu, Lock, Award,
  Wallet, Layers, Music2, Laugh, HandCoins,
  Landmark, HeartHandshake, ShieldCheck,
  BadgeCheck, Leaf, Volume2, Camera,
  Headphones, Mic, BookOpen, Crown,
  Flame, Zap as Lightning, Brush, Palette
} from "lucide-react";

// Afrobeats-inspired color palette
const grimeColors = {
  electricLime: '#00FF41',
  hotMagenta: '#FF0080', 
  blazeOrange: '#FF4500',
  cyberBlue: '#00BFFF',
  goldRush: '#FFD700',
  dustyRed: '#CD5C5C',
  streetGreen: '#228B22',
  urbanPurple: '#9370DB',
  sunsetPink: '#FF69B4',
  neonYellow: '#FFFF00',
  electricViolet: '#8B00FF',
  fireRed: '#DC143C',
  jadeGreen: '#00FF7F',
  charcoal: '#1a1a1a',
  deepBlack: '#0a0a0a',
  smokeyGray: '#2d2d2d'
};

// CDN illustration sources
const illustrations = {
  avatar: (seed) => `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=transparent`,
  pixel: (seed) => `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}&backgroundColor=transparent`,
  shapes: (seed) => `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=transparent`,
  openPeeps: (seed) => `https://api.dicebear.com/7.x/open-peeps/svg?seed=${seed}&backgroundColor=transparent`,
};

// Animated Graffiti Background
const GraffitiBackground = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, -300]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -150]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <motion.div 
        style={{ y: y1 }}
        className="absolute -top-1/2 -left-1/2 w-full h-full opacity-20 blur-3xl"
        style={{
          background: `conic-gradient(from 45deg at 60% 40%, 
            ${grimeColors.electricLime}, 
            ${grimeColors.hotMagenta}, 
            ${grimeColors.cyberBlue}, 
            ${grimeColors.blazeOrange}, 
            ${grimeColors.goldRush},
            ${grimeColors.electricViolet},
            ${grimeColors.electricLime})`
        }}
      />
      
      <motion.div 
        style={{ y: y2 }}
        className="absolute top-20 right-20 w-96 h-96 rounded-full blur-2xl opacity-30"
        style={{
          background: `radial-gradient(circle, ${grimeColors.hotMagenta}60 0%, transparent 70%)`
        }}
      />
    </div>
  );
};

// Enhanced Logo with Paint Drips
const DeyPlayLogo = () => (
  <motion.div 
    className="flex items-center gap-3"
    whileHover={{ scale: 1.05 }}
  >
    <motion.div
      className="w-12 h-12 rounded-2xl relative overflow-hidden shadow-lg"
      animate={{ 
        background: [
          `linear-gradient(45deg, ${grimeColors.electricLime}, ${grimeColors.hotMagenta})`,
          `linear-gradient(45deg, ${grimeColors.cyberBlue}, ${grimeColors.blazeOrange})`,
          `linear-gradient(45deg, ${grimeColors.goldRush}, ${grimeColors.electricViolet})`,
          `linear-gradient(45deg, ${grimeColors.electricLime}, ${grimeColors.hotMagenta})`
        ]
      }}
      transition={{ duration: 4, repeat: Infinity }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <Play className="w-6 h-6 text-white font-bold drop-shadow-lg" />
      </div>
    </motion.div>
    
    <div className="flex items-baseline">
      <span className="text-3xl font-black text-white tracking-tight drop-shadow-lg">dey</span>
      <motion.span 
        className="text-3xl font-black tracking-tight drop-shadow-lg text-rainbow-animated"
      >
        .play
      </motion.span>
    </div>
  </motion.div>
);

// Track Card Component
const TrackCard = ({ icon: Icon, title, description, features, gradient, seed, paintColor }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    whileHover={{ y: -15, scale: 1.02 }}
    className="relative p-8 rounded-3xl cursor-pointer group overflow-hidden border border-white/10"
    style={{ background: gradient }}
  >
    <div className="absolute top-8 right-8 w-20 h-20 opacity-20 group-hover:opacity-40 transition-opacity duration-300">
      <img 
        src={illustrations.pixel(seed)} 
        alt="decoration"
        className="w-full h-full object-contain drop-shadow-lg"
      />
    </div>
    
    <div className="relative z-10">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-18 h-18 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-lg" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <Icon className="w-8 h-8 text-white drop-shadow-lg" />
        </div>
      </div>
      
      <h3 className="text-2xl font-bold text-white mb-4 drop-shadow-md leading-tight">{title}</h3>
      <p className="text-white/90 mb-6 leading-relaxed drop-shadow-sm text-base">{description}</p>
      
      <ul className="space-y-3">
        {features.map((feature, index) => (
          <motion.li 
            key={index} 
            className="flex items-center text-white/80 text-sm"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="w-5 h-5 rounded-full mr-3 flex items-center justify-center" style={{ background: paintColor + '40' }}>
              <CheckCircle className="w-3 h-3 text-white drop-shadow-sm" />
            </div>
            <span className="drop-shadow-sm">{feature}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  </motion.div>
);

// Info Chip Component
const InfoChip = ({ label }) => (
  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-black/40 border border-white/10 text-white">
    {label}
  </span>
);

// Meme Tile Component
const MemeTile = ({ tag }) => (
  <div className="relative rounded-2xl aspect-square overflow-hidden bg-black/40 border border-white/10">
    <div 
      className="absolute inset-0 w-full h-full opacity-80"
      style={{
        background: `linear-gradient(135deg, ${grimeColors.electricLime}, ${grimeColors.cyberBlue}, ${grimeColors.hotMagenta})`
      }}
    />
    <div className="absolute inset-0 p-2 flex flex-col">
      <div className="flex justify-between">
        <span className="text-[10px] uppercase font-bold tracking-widest bg-black/50 px-1.5 py-1 rounded text-white">Mint</span>
        <span className="text-[10px] bg-black/50 px-1.5 py-1 rounded inline-flex items-center gap-1 text-white">
          <Leaf className="h-3 w-3"/>HTS
        </span>
      </div>
      <div className="mt-auto">
        <p className="text-xs font-extrabold text-white">{tag}</p>
      </div>
    </div>
  </div>
);

// Main Component
export default function DeyPlayLanding() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const tracks = [
    {
      icon: Coins,
      title: "Onchain Finance & RWA",
      description: "Digital Ajo meets blockchain magic. Build generational wealth the Yoruba way with transparent community savings, asset tokenization, and financial freedom.",
      features: ["Traditional Ajo on Hedera", "RWA tokenization for African assets", "Community microfinance pools", "AI-powered staking optimization"],
      gradient: `linear-gradient(135deg, ${grimeColors.blazeOrange}, ${grimeColors.fireRed}, ${grimeColors.hotMagenta})`,
      paintColor: grimeColors.blazeOrange,
      seed: "finance-ajo-master"
    },
    {
      icon: Eye,
      title: "DLT for Operations", 
      description: "Expose fake NGOs, churches, and charities with African precision. Every naira tracked, every lie exposed, every truth celebrated on-chain.",
      features: ["NGO transparency dashboards", "Real-time donation tracking", "Public audit trails", "Anonymous whistleblower protection"],
      gradient: `linear-gradient(135deg, ${grimeColors.cyberBlue}, ${grimeColors.electricViolet}, ${grimeColors.urbanPurple})`,
      paintColor: grimeColors.cyberBlue,
      seed: "transparency-truth-seeker"
    },
    {
      icon: Gamepad2,
      title: "Immersive Experience",
      description: "Mint Nigerian culture, celebrate our heritage through digital collectibles, virtual Owambe parties, and community-driven cultural preservation.",
      features: ["Cultural NFT collections", "Nigerian meme marketplace", "Virtual Owambe events", "Community cultural rewards"],
      gradient: `linear-gradient(135deg, ${grimeColors.jadeGreen}, ${grimeColors.streetGreen}, ${grimeColors.electricLime})`,
      paintColor: grimeColors.jadeGreen,
      seed: "culture-keeper-vibes"
    },
    {
      icon: Zap,
      title: "AI & DePIN",
      description: "AI-powered fraud detection and decentralized infrastructure built specifically for Africa's digital revolution and economic transformation.",
      features: ["AI-powered lie detection systems", "Community-owned networks", "Predictive fraud analytics", "DePIN infrastructure integration"],
      gradient: `linear-gradient(135deg, ${grimeColors.electricViolet}, ${grimeColors.goldRush}, ${grimeColors.neonYellow})`,
      paintColor: grimeColors.electricViolet,
      seed: "ai-depin-future"
    }
  ];

  return (
    <>
      <style>{`
        /* The CSS styles for the rainbow animation, applied directly to this component */
        .text-rainbow-animated {
          background: linear-gradient(90deg, #00FF41, #FF0080, #00BFFF, #FF4500, #FFD700, #8B00FF);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent; 
          animation: color-cycle 10s linear infinite;
        }

        @keyframes color-cycle {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
      
      <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
        <GraffitiBackground />

        <nav className="fixed top-0 w-full z-50 bg-black/90 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <DeyPlayLogo />
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 rounded-2xl font-bold flex items-center gap-2 text-black transition-all duration-300 shadow-lg"
              style={{
                background: `linear-gradient(45deg, ${grimeColors.electricLime}, ${grimeColors.jadeGreen})`
              }}
            >
              <span className="text-black">Launch dApp</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </nav>

        <section className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 relative z-20">
            <div className="max-w-7xl mx-auto">
              <div className="text-center"> {/* Removed bottom margin for better vertical centering */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8"
                >
                  <span className="text-sm sm:text-base font-black px-6 py-3 rounded-full border-2 shadow-lg" style={{ borderColor: grimeColors.electricLime, color: grimeColors.electricLime, background: `${grimeColors.electricLime}20` }}>
                    WE DEY SEE ALL YOUR LIES 👁️ NO CAP!
                  </span>
                </motion.div>
                
                {/* Increased heading text size for more impact */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-6xl sm:text-8xl lg:text-9xl font-black mb-8 leading-tight text-rainbow-animated"
                >
                  Dey.Play — We see through the hype.
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-lg sm:text-xl text-gray-200 mb-12 max-w-4xl mx-auto leading-relaxed"
                >
                  Meme-heavy, Yoruba-coded, Lagos-loud. Track fraud, flex unity, and move money the Naija way:
                  transparent NGOs & churches, digital Ajo, and community collectibles — all on Hedera.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
                >
                  <motion.button 
                    whileHover={{ scale: 1.05, boxShadow: `0 10px 30px ${grimeColors.electricLime}40` }}
                    whileTap={{ scale: 0.95 }}
                    className="px-10 py-5 rounded-2xl font-bold text-lg text-black flex items-center justify-center gap-3 transition-all duration-300 shadow-2xl"
                    style={{ 
                      background: `linear-gradient(45deg, ${grimeColors.electricLime}, ${grimeColors.jadeGreen})`
                    }}
                  >
                    <Sparkles className="w-5 h-5" />
                    <span className="text-black">Join Beta Waitlist</span>
                  </motion.button>
                  
                  <motion.button 
                    whileHover={{ scale: 1.05, boxShadow: `0 10px 30px ${grimeColors.hotMagenta}40` }}
                    whileTap={{ scale: 0.95 }}
                    className="px-10 py-5 rounded-2xl font-bold text-lg border-2 hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-3 text-rainbow-animated"
                    style={{ 
                      borderColor: grimeColors.hotMagenta, 
                    }}
                  >
                    <Play className="w-5 h-5" style={{ color: grimeColors.hotMagenta }}/>
                    Watch Demo
                  </motion.button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-300" // Removed mb-20
                >
                  <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-black/30 backdrop-blur-sm border border-white/10">
                    <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: grimeColors.jadeGreen }} />
                    <span className="font-medium">Built on Hedera</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-black/30 backdrop-blur-sm border border-white/10">
                    <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: grimeColors.goldRush }} />
                    <span className="font-medium">Made in Nigeria 🇳🇬</span>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

        <section className="py-20 px-4 sm:px-6 relative">
          <div className=" mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black mb-8 leading-tight">
                <span className="block text-white drop-shadow-lg">How We Dey</span>
                <span className="block drop-shadow-lg text-rainbow-animated">
                  Scatter All Lies
                </span>
              </h2>
              <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
                Four powerful tracks, one mission: building transparent, wealthy, and unified Nigeria 
                through blockchain technology and African innovation
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8">
              {tracks.map((track, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                >
                  <TrackCard {...track} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 relative">
          <div className=" mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Eye className="h-8 w-8" style={{ color: grimeColors.electricLime }} />
                <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-rainbow-animated">If you dey do good, make ledger show am.</h2>
              </div>
              <p className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
                Public, human‑readable receipts. Every donation, every spend, verifiable on Hedera. No long talk.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {[
                { icon: ShieldCheck, title: "Tamper‑proof records", copy: "Immutable HCS messages + mirror queries." },
                { icon: BadgeCheck, title: "Donor trust UI", copy: "QR receipts, live inflow/outflow charts." },
                { icon: HeartHandshake, title: "Community oversight", copy: "Anonymous whistleblower with cryptographic proof." },
              ].map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="p-8 rounded-3xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10">
                      <f.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                  <p className="text-white/80 text-sm leading-relaxed">{f.copy}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 relative">
          <div className=" mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <HandCoins className="h-8 w-8" style={{ color: grimeColors.goldRush }} />
                  <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-rainbow-animated">Ajo — round by round, everybody chop.</h2>
                </div>
                <p className="text-xl text-white/80 mb-8 leading-relaxed">
                  Create a circle, set rounds, add members. Payouts rotate automatically with transparent rules, dispute‑free.
                </p>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  className="px-8 py-4 rounded-2xl font-bold text-black flex items-center gap-3"
                  style={{
                    background: `linear-gradient(45deg, ${grimeColors.goldRush}, ${grimeColors.blazeOrange})`
                  }}
                >
                  <HandCoins className="w-5 h-5" />
                  <span className="text-black">Start Your Ajo</span>
                </motion.button>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div 
                  className="rounded-3xl p-8 border border-white/10 relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${grimeColors.goldRush}20, ${grimeColors.blazeOrange}10)`
                  }}
                >
                  <div className="flex items-center gap-4 mb-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30">
                        <img 
                          src={illustrations.avatar(`member-${i}`)} 
                          alt={`member ${i}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    <span className="text-sm text-white/70 font-medium">+ 12 members</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <InfoChip label="₦10k / week" />
                    <InfoChip label="8 rounds" />
                    <InfoChip label="Auto‑payout" />
                    <InfoChip label="Hedera escrow" />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-white/80">
                    <span>Next Payout: Kemi O.</span>
                    <span className="font-bold" style={{ color: grimeColors.electricLime }}>Active</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 relative">
          <div className=" mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Laugh className="h-8 w-8" style={{ color: grimeColors.hotMagenta }} />
                <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-rainbow-animated">Collect the slang. Mint the memes.</h2>
              </div>
              <p className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
                Limited drops: dey play, sapa, lapo baby, more. Community‑priced mints with creator splits.
              </p>
            </motion.div>

            <div className="grid grid-cols-3 gap-4 sm:grid-cols-6 max-w-4xl mx-auto">
              {["dey play", "sapa", "wazobia", "oga abeg", "steady", "jidimma"].map((tag, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <MemeTile tag={tag} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 relative">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-8 leading-tight">
                <span className="text-white drop-shadow-lg">Ready to </span>
                <span className="drop-shadow-lg text-rainbow-animated">
                  Dey Play
                </span>
                <span className="text-white drop-shadow-lg">?</span>
              </h2>
              
              <p className="text-xl text-gray-300 mb-16 max-w-3xl mx-auto leading-relaxed">
                Join the movement building the future of transparent Nigeria. 
                Every voice matters, every action counts, every truth shared makes us stronger.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: `0 20px 40px ${grimeColors.electricLime}40` }}
                  className="px-12 py-6 rounded-2xl font-black text-xl text-black flex items-center gap-4 shadow-2xl"
                  style={{
                    background: `linear-gradient(45deg, ${grimeColors.electricLime}, ${grimeColors.jadeGreen})`
                  }}
                >
                  <Play className="w-6 h-6" />
                  <span className="text-black">Launch dApp</span>
                  <ArrowRight className="w-6 h-6" />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: `0 20px 40px ${grimeColors.hotMagenta}40` }}
                  whileTap={{ scale: 0.95 }}
                  className="px-12 py-6 rounded-2xl font-black text-xl border-2 hover:bg-white/10 transition-all duration-300 flex items-center gap-4 text-rainbow-animated"
                  style={{
                    borderColor: grimeColors.hotMagenta,
                  }}
                >
                  <BookOpen className="w-6 h-6" style={{ color: grimeColors.hotMagenta }}/>
                  Read Docs
                </motion.button>
              </div>
            </motion.div>
          </div>
        </section>
        
        <footer className="bg-black py-16 px-4 sm:px-6 relative z-10 border-t border-white/10">
          <div className=" mx-auto text-sm text-gray-400 text-center">
            <DeyPlayLogo />
            <p className="mt-8 mb-4">© 2024 Dey.Play. All rights reserved.</p>
            <div className="flex justify-center space-x-6">
              <a href="#" className="hover:text-white transition-colors duration-200">Twitter</a>
              <a href="#" className="hover:text-white transition-colors duration-200">Discord</a>
              <a href="#" className="hover:text-white transition-colors duration-200">Docs</a>
            </div>
            <div className="flex items-center justify-center gap-2 mt-8">
              <Leaf className="h-4 w-4 text-green-400" />
              <span>Powered by Hedera Hashgraph</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}