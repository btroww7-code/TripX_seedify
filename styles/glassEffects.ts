export const glassEffects = {
  // Premium glassmorphic containers
  container: {
    base: "backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
    light: "bg-white/[0.03]",
    medium: "bg-white/[0.05]",
    dark: "bg-black/[0.2]",
  },

  // Card variants
  card: {
    default: "backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition-all duration-300",
    hover: "hover:bg-white/[0.05] hover:border-white/[0.12] hover:shadow-[0_12px_48px_rgba(0,0,0,0.16)]",
    active: "bg-white/[0.06] border-white/[0.12] shadow-[0_12px_48px_rgba(0,0,0,0.16)]",
  },

  // Input fields
  input: {
    base: "backdrop-blur-lg bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.05] transition-all duration-300",
  },

  // Buttons
  button: {
    glass: "backdrop-blur-lg bg-white/[0.05] border border-white/[0.10] rounded-xl px-6 py-3 text-white font-medium hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300",
    primary: "backdrop-blur-lg bg-gradient-to-r from-teal-500/90 to-cyan-500/90 border border-white/[0.15] rounded-xl px-6 py-3 text-white font-semibold shadow-[0_8px_24px_rgba(20,184,166,0.25)] hover:shadow-[0_12px_32px_rgba(20,184,166,0.35)] transition-all duration-300",
  },

  // Modal/Dialog
  modal: {
    backdrop: "fixed inset-0 bg-black/60 backdrop-blur-sm",
    container: "backdrop-blur-2xl bg-black/40 border border-white/[0.08] rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.3)]",
  },

  // Animations
  animations: {
    fadeInUp: "opacity-0 translate-y-8 blur-sm",
    fadeIn: "opacity-1 translate-y-0 blur-0",
    shimmer: "absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent",
    glow: "absolute -inset-1 bg-gradient-to-r from-white/[0.05] via-white/[0.08] to-white/[0.05] rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
  },

  // Inline styles for complex effects
  inlineStyles: {
    glass: {
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      MozBackdropFilter: 'blur(12px)',
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    },
    glassStrong: {
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      MozBackdropFilter: 'blur(16px)',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    textShadow: {
      textShadow: '0 2px 8px rgba(0,0,0,0.5)',
    },
    textShadowLight: {
      textShadow: '0 1px 4px rgba(0,0,0,0.4)',
    },
  }
};
