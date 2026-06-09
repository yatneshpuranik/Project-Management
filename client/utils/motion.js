export const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25, ease: [0.7, 0, 0.84, 0] } }
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.04
    }
  }
};

export const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
  }
};

export const hoverLift = {
  whileHover: { y: -3, scale: 1.01, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
  whileTap: { scale: 0.985 }
};

export const glowBreath = {
  animate: {
    scale: [1, 1.03, 1],
    opacity: [0.55, 0.7, 0.55],
    transition: {
      duration: 5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};
