import React from "react";
import ReactMarkdown from "react-markdown";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  CheckCircle,
  HelpCircle,
  BookOpen,
  Brain,
  Zap,
  RefreshCw,
} from "lucide-react";

// Markdown components for styled rendering
const markdownComponents = {
  p: ({ children }) => (
    <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-none mb-3 space-y-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 mb-3 space-y-2">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="flex gap-2">
      <span className="text-current opacity-70 mt-1.5 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-bold opacity-100">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="opacity-90 not-italic border-b border-current/30">
      {children}
    </em>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-current/30 pl-4 py-1 my-3 bg-bg-base/10 rounded-r opacity-90 italic">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="bg-bg-base/20 rounded px-1.5 py-0.5 font-mono text-sm opacity-90 mx-1">
      {children}
    </code>
  ),
};

const STAGE_CONFIG = {
  1: {
    color: "text-accent-success",
    borderColor: "border-accent-success",
    bgColor: "bg-accent-success",
    icon: Sparkles,
    label: "词汇速查",
    gradient: "from-accent-success/10 to-transparent",
  },
  2: {
    color: "text-category-blue",
    borderColor: "border-category-blue",
    bgColor: "bg-category-blue",
    icon: Zap,
    label: "结构分析",
    gradient: "from-category-blue/10 to-transparent",
  },
  3: {
    color: "text-category-indigo",
    borderColor: "border-category-indigo",
    bgColor: "bg-category-indigo",
    icon: BookOpen,
    label: "英文拆解",
    gradient: "from-category-indigo/10 to-transparent",
  },
  4: {
    color: "text-category-red",
    borderColor: "border-category-red",
    bgColor: "bg-category-red",
    icon: Brain,
    label: "中文深度解释",
    gradient: "from-category-red/10 to-transparent",
  },
};

const ExplanationCard = ({
  simplifiedText,
  simplifyStage,
  isSimplifying,
  onSimplifiedResponse,
  onRetry,
}) => {
  const config = STAGE_CONFIG[simplifyStage] || STAGE_CONFIG[1];
  const Icon = config.icon;

  if (!simplifiedText && !isSimplifying) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={simplifyStage}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`w-full mt-4 md:mt-8 relative overflow-hidden rounded-xl border border-white/10 shadow-2xl backdrop-blur-md bg-[#0a0f0d]/80`}
      >
        {/* Dynamic Gradient Background */}
        <div
          className={`absolute inset-0 bg-gradient-to-b ${config.gradient} opacity-20 pointer-events-none`}
        />

        {/* Top Border Accent */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 ${config.bgColor} shadow-[0_0_10px_currentColor] opacity-80`}
        />

        <div className="relative p-4 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg bg-black/40 border border-white/5 ${config.color}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3
                  className={`font-bold uppercase tracking-wider text-sm ${config.color} drop-shadow-sm`}
                >
                  {config.label}
                </h3>
                <div className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
                  <span>Stage {simplifyStage}/4</span>
                  <span className="w-1 h-1 rounded-full bg-text-muted" />
                  <span>AI Analysis</span>
                </div>
              </div>
            </div>

            {isSimplifying && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.bgColor} opacity-75`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.bgColor}`}
                  ></span>
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div
            className={`font-serif text-base md:text-lg leading-relaxed ${config.color} selection:bg-light-surface/20 selection:text-text-primary min-h-[60px] md:min-h-[100px]`}
          >
            {simplifiedText ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <ReactMarkdown components={markdownComponents}>
                  {simplifiedText}
                </ReactMarkdown>
              </motion.div>
            ) : (
              isSimplifying && (
                <div className="flex flex-col items-center justify-center py-8 gap-4 opacity-50">
                  <div className="flex gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${config.bgColor} animate-bounce`}
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className={`w-2 h-2 rounded-full ${config.bgColor} animate-bounce`}
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className={`w-2 h-2 rounded-full ${config.bgColor} animate-bounce`}
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                  <span className="font-mono text-xs uppercase tracking-widest">
                    Processing Context...
                  </span>
                </div>
              )
            )}
            {!isSimplifying && simplifiedText === "加载失败，请重试" && (
              <div className="flex flex-col items-center justify-center py-6 gap-4">
                <button
                  onClick={onRetry}
                  className="flex items-center gap-2 px-6 py-2.5 bg-accent-danger/20 hover:bg-accent-danger/30 text-accent-danger border border-accent-danger/30 rounded-lg transition-all active:scale-95 font-bold uppercase text-xs tracking-widest"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>重试加载</span>
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          {!isSimplifying && simplifiedText && simplifiedText !== "加载失败，请重试" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 md:mt-8 flex flex-wrap justify-center gap-4 border-t border-white/5 pt-4 md:pt-6"
            >
              <button
                onClick={() => onSimplifiedResponse(true)}
                className={`flex items-center justify-center gap-2 px-8 py-3.5 font-bold uppercase text-sm tracking-wide transition-all rounded-lg shadow-lg
                                    ${config.bgColor} text-text-primary hover:brightness-110 active:scale-95`}
              >
                <CheckCircle className="w-4 h-4" />
                {simplifyStage === 4 ? "Understood" : "Got it"}
              </button>

              <button
                onClick={() => onSimplifiedResponse(false)}
                className={`flex items-center justify-center gap-2 px-8 py-3.5 border-2 transition-all rounded-lg font-bold uppercase text-sm tracking-wide active:scale-95
                                    ${simplifyStage < 4
                    ? `border-white/10 hover:border-${config.color.split("-")[1]}-${config.color.split("-")[2]} text-text-secondary hover:text-text-primary bg-bg-base/20 hover:bg-bg-base/40`
                    : "border-white/10 text-text-muted cursor-not-allowed opacity-50"
                  }`}
                disabled={simplifyStage >= 4}
              >
                <HelpCircle className="w-4 h-4" />
                {simplifyStage < 4 ? "Still Unclear" : "Max Level"}
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ExplanationCard;
