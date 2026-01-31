import React, { useState } from "react";
import {
  Terminal,
  BookOpen,
  Zap,
  Activity,
  ChevronRight,
  Search,
  Check,
  X,
  Shield,
  Code,
  Layout,
  Grid,
  GitBranch,
  Cpu,
  Play,
  Pause,
  Settings,
  User,
  Star,
  Sparkles,
  Rocket,
  Bell,
} from "lucide-react";

/**
 * 🎨 UNIFIED DESIGN SYSTEM: "POINTER INSPIRED"
 * =============================================================================
 *
 * 核心理念 (Core Philosophy):
 * 融合 Pointer 的现代感与 NCE 的教育功能。
 * 深绿色渐变背景 + 网格纹理 + 毛玻璃卡片 + 胶囊按钮。
 *
 * 1. 色彩策略 (Color Strategy):
 *    - 背景: 深绿色渐变 (#0D1A14 -> #1A2E24) + 网格纹理叠加
 *    - 强调色:
 *      - Primary: #6FE3B1 (薄荷绿) - 主要行动
 *      - Accent: #A8FFD5 (浅薄荷) - 高亮
 *      - Warning: #FF6B6B (珊瑚红) - 错误/警告
 *      - Info: #4ECDC4 (青绿) - 信息
 *
 * 2. 形状与质感 (Shape & Texture):
 *    - 圆角: 12-16px (现代化)
 *    - 毛玻璃: backdrop-blur-xl + 半透明背景
 *    - 阴影: 柔和的多层阴影
 *    - 边框: 1px 半透明边框 (border-white/10)
 *
 * 3. 排版 (Typography):
 *    - 标题: Inter / SF Pro - 现代无衬线
 *    - 正文: Inter - 易读性优先
 *    - 代码: JetBrains Mono - 代码块
 * =============================================================================
 */

const UnifiedDesignSystem = () => {
  const [activeTab, setActiveTab] = useState("training");

  return (
    <div className="min-h-screen bg-[#0A0F0D] text-[#E8F5E9] font-sans selection:bg-[#6FE3B1]/30 selection:text-white overflow-x-hidden">
      {/* BACKGROUND GRADIENT */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0A0F0D] via-[#0D1A14] to-[#152821] z-0" />

      {/* GRID TEXTURE OVERLAY */}
      <div
        className="fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `
                        linear-gradient(rgba(111, 227, 177, 0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(111, 227, 177, 0.3) 1px, transparent 1px)
                    `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* FLOATING DECORATION ELEMENTS */}
      <div className="fixed top-20 right-20 w-64 h-64 bg-[#6FE3B1]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 left-20 w-96 h-96 bg-[#4ECDC4]/5 rounded-full blur-3xl pointer-events-none" />

      {/* MAIN CONTENT */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 py-8">
        {/* HEADER NAVIGATION */}
        <header className="flex items-center justify-between mb-20">
          <div className="flex items-center gap-12">
            {/* LOGO */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#6FE3B1] to-[#4ECDC4] rounded-xl flex items-center justify-center shadow-lg shadow-[#6FE3B1]/20">
                <Zap size={22} className="text-[#0A0F0D] fill-current" />
              </div>
              <span className="text-xl font-semibold text-white tracking-tight">
                NCE
              </span>
            </div>

            {/* NAV LINKS */}
            <nav className="hidden md:flex items-center gap-8">
              {["Features", "Pricing", "Testimonials", "Docs"].map((item) => (
                <button
                  key={item}
                  className="text-sm text-[#8B9D93] hover:text-white transition-colors duration-200 font-medium"
                >
                  {item}
                </button>
              ))}
            </nav>
          </div>

          {/* CTA BUTTON */}
          <button className="px-6 py-2.5 bg-[#E8F5E9] text-[#0A0F0D] rounded-full text-sm font-semibold hover:bg-white transition-all duration-200 shadow-lg shadow-[#6FE3B1]/10 hover:shadow-xl hover:shadow-[#6FE3B1]/20">
            Try for Free
          </button>
        </header>

        {/* HERO SECTION */}
        <section className="text-center mb-24">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight leading-tight">
            Unleash the Power of
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6FE3B1] to-[#4ECDC4]">
              Grammar Training
            </span>
          </h1>
          <p className="text-lg md:text-xl text-[#8B9D93] max-w-2xl mx-auto mb-10 leading-relaxed">
            Accelerate your English mastery with intelligent AI agents that
            guide, review, and optimize your learning journey.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button className="px-8 py-3.5 bg-[#E8F5E9] text-[#0A0F0D] rounded-full text-sm font-semibold hover:bg-white transition-all duration-200 shadow-lg shadow-[#6FE3B1]/20 flex items-center gap-2">
              <Rocket size={18} />
              Start Learning
            </button>
            <button className="px-8 py-3.5 bg-white/5 border border-white/10 text-white rounded-full text-sm font-semibold hover:bg-white/10 transition-all duration-200 backdrop-blur-sm">
              View Demo
            </button>
          </div>
        </section>

        {/* FEATURE BENTO GRID */}
        <section className="mb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CARD 1: AI-POWERED REVIEWS */}
            <BentoCard
              className="md:col-span-1"
              icon={<Code size={20} />}
              title="AI-powered code reviews"
              subtitle="Get real-time, smart suggestions for cleaner code."
            >
              <div className="mt-4 p-4 bg-black/30 rounded-xl border border-white/5 font-mono text-xs">
                <div className="text-[#6FE3B1] mb-2">{`// Smart suggestion`}</div>
                <div className="text-[#8B9D93]">
                  <span className="text-[#FF6B6B]">- </span>
                  <span>eat faint hope</span>
                </div>
                <div className="text-[#8B9D93]">
                  <span className="text-[#6FE3B1]">+ </span>
                  <span className="text-[#6FE3B1]">will have eaten</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="px-2 py-1 bg-[#6FE3B1]/20 text-[#6FE3B1] rounded text-[10px] font-medium">
                    Future Perfect
                  </span>
                </div>
              </div>
            </BentoCard>

            {/* CARD 2: REAL-TIME PREVIEW */}
            <BentoCard
              className="md:col-span-1"
              icon={<Layout size={20} />}
              title="Real-time coding previews"
              subtitle="Chat, collaborate, and instantly preview changes together."
            >
              <div className="mt-4 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#6FE3B1]/20 to-transparent rounded-xl" />
                <div className="p-4 bg-black/30 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-2 h-2 rounded-full bg-[#6FE3B1] animate-pulse" />
                    <span className="text-xs text-[#6FE3B1] font-medium">
                      Live Session
                    </span>
                  </div>
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4ECDC4] to-[#6FE3B1] border-2 border-[#0A0F0D] flex items-center justify-center text-[10px] font-bold text-[#0A0F0D]"
                      >
                        U{i}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* CARD 3: INTEGRATIONS */}
            <BentoCard
              className="md:col-span-1"
              icon={<Grid size={20} />}
              title="One-click integrations"
              subtitle="Easily connect your workflow with popular dev tools."
            >
              <div className="mt-4 grid grid-cols-3 gap-2">
                {["Collins", "LDOCE", "Gemini", "DeepSeek", "Edge", "More"].map(
                  (tool, i) => (
                    <div
                      key={tool}
                      className="aspect-square bg-black/30 rounded-lg border border-white/5 flex items-center justify-center text-[10px] text-[#8B9D93] hover:bg-[#6FE3B1]/10 hover:border-[#6FE3B1]/30 hover:text-[#6FE3B1] transition-all cursor-pointer"
                    >
                      {tool}
                    </div>
                  ),
                )}
              </div>
            </BentoCard>

            {/* CARD 4: MCP CONNECTIVITY */}
            <BentoCard
              className="md:col-span-1"
              icon={<GitBranch size={20} />}
              title="Flexible MCP connectivity"
              subtitle="Effortlessly manage and configure MCP server access."
            >
              <div className="mt-4 space-y-2">
                {[
                  { name: "Grammar Service", status: "Active", icon: "G" },
                  { name: "Dictionary API", status: "Connected", icon: "D" },
                  { name: "Voice Service", status: "Standby", icon: "V" },
                ].map((service) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#6FE3B1]/10 flex items-center justify-center text-[#6FE3B1] text-xs font-bold">
                        {service.icon}
                      </div>
                      <span className="text-sm text-[#E8F5E9]">
                        {service.name}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        service.status === "Active"
                          ? "bg-[#6FE3B1]/20 text-[#6FE3B1]"
                          : service.status === "Connected"
                            ? "bg-[#4ECDC4]/20 text-[#4ECDC4]"
                            : "bg-[#8B9D93]/20 text-[#8B9D93]"
                      }`}
                    >
                      {service.status}
                    </span>
                  </div>
                ))}
              </div>
            </BentoCard>

            {/* CARD 5: PARALLEL AGENTS */}
            <BentoCard
              className="md:col-span-1"
              icon={<Cpu size={20} />}
              title="Launch parallel coding agents"
              subtitle="Solve complex problems faster with multiple AI agents."
            >
              <div className="mt-4 space-y-2">
                {[
                  { task: "Update buttons", tokens: "12k", model: "o3" },
                  { task: "Fix sanity issue", tokens: "12k", model: "claude" },
                  { task: "Plan for seamless", tokens: "30k", model: "o3" },
                ].map((task, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-black/30 rounded-lg border border-white/5 hover:border-[#6FE3B1]/30 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#6FE3B1]/20 flex items-center justify-center">
                      <Check size={12} className="text-[#6FE3B1]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-[#E8F5E9]">{task.task}</div>
                      <div className="text-xs text-[#8B9D93]">
                        {task.tokens} tokens • {task.model}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </BentoCard>

            {/* CARD 6: DEPLOYMENT */}
            <BentoCard
              className="md:col-span-1"
              icon={<Rocket size={20} />}
              title="Deployment made easy"
              subtitle="Go from code to live deployment on Vercel instantly."
            >
              <div className="mt-4 p-4 bg-black/30 rounded-xl border border-white/5 font-mono text-[10px] text-[#8B9D93] space-y-1">
                <div>[16:37:25] Running build in Washington...</div>
                <div>[16:37:25] Build machine: 2 cores, 8GB</div>
                <div>[16:37:29] Running &quot;vercel build&quot;</div>
                <div>[16:37:30] Vercel CLI 44.5.0</div>
                <div>[16:37:39] Next.js build completed</div>
                <div className="text-[#6FE3B1]">
                  [16:37:40] ✓ Deployed successfully
                </div>
              </div>
            </BentoCard>
          </div>
        </section>

        {/* TRAINING DASHBOARD SECTION */}
        <section className="mb-24">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">
              Training Dashboard
            </h2>
            <div className="flex items-center gap-2">
              <StatBadge icon={Activity} value="12 Days" label="Streak" />
              <StatBadge icon={Star} value="8,400" label="XP" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* LEFT SIDEBAR */}
            <div className="lg:col-span-1 space-y-4">
              <nav className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-2">
                {[
                  { id: "dashboard", label: "Dashboard", icon: Layout },
                  {
                    id: "training",
                    label: "Training Matrix",
                    icon: Terminal,
                    active: true,
                  },
                  { id: "stories", label: "Story Archive", icon: BookOpen },
                  { id: "chat", label: "Neural Chat", icon: Cpu },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      item.active
                        ? "bg-[#6FE3B1]/10 text-[#6FE3B1] border border-[#6FE3B1]/20"
                        : "text-[#8B9D93] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="bg-gradient-to-br from-[#6FE3B1]/10 to-[#4ECDC4]/10 backdrop-blur-xl rounded-2xl border border-[#6FE3B1]/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Daily Mission
                </h3>
                <p className="text-sm text-[#8B9D93] mb-4">
                  Complete 3 sets of{" "}
                  <span className="text-[#6FE3B1]">Past Perfect</span> exercises
                </p>
                <div className="w-full bg-black/30 rounded-full h-2 mb-4">
                  <div className="w-2/3 bg-gradient-to-r from-[#6FE3B1] to-[#4ECDC4] h-full rounded-full" />
                </div>
                <button className="w-full py-2.5 bg-[#6FE3B1] text-[#0A0F0D] rounded-xl text-sm font-semibold hover:bg-[#7FF3C1] transition-colors">
                  Continue Training
                </button>
              </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="lg:col-span-3 space-y-6">
              {/* INTERACTIVE CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* STORY MODE CARD */}
                <div className="group bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:border-[#6FE3B1]/30 transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-[#6FE3B1]/10 text-[#6FE3B1] rounded-full text-xs font-medium">
                        Story Mode
                      </span>
                      <span className="px-3 py-1 bg-white/5 text-[#8B9D93] rounded-full text-xs font-medium">
                        RP
                      </span>
                    </div>
                    <BookOpen size={20} className="text-[#8B9D93]" />
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-[#6FE3B1] transition-colors">
                    The Midnight Detective
                  </h3>

                  <p className="text-[#8B9D93] leading-relaxed mb-4 text-sm">
                    &quot;It{" "}
                    <span className="text-white font-medium">
                      had been raining
                    </span>{" "}
                    for three days when she finally walked into my office. I{" "}
                    <span className="text-white font-medium">
                      had never seen
                    </span>{" "}
                    anyone look so lost...&quot;
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <span className="text-xs text-[#8B9D93]">
                      Difficulty: Hard
                    </span>
                    <button className="flex items-center gap-1 text-sm text-[#6FE3B1] hover:text-white transition-colors">
                      Resume <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* DRILL MODE CARD */}
                <div className="group bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:border-[#FF6B6B]/30 transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-[#FF6B6B]/10 text-[#FF6B6B] rounded-full text-xs font-medium">
                        Drill Matrix
                      </span>
                      <span className="px-3 py-1 bg-white/5 text-[#8B9D93] rounded-full text-xs font-medium">
                        Speed
                      </span>
                    </div>
                    <Terminal size={20} className="text-[#8B9D93]" />
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-[#FF6B6B] transition-colors">
                    Tense Transformation
                  </h3>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#8B9D93]">Target:</span>
                      <span className="text-[#6FE3B1] font-medium">
                        Future Perfect
                      </span>
                    </div>
                    <div className="p-3 bg-black/30 rounded-lg border border-white/5 font-mono text-sm">
                      I{" "}
                      <span className="text-[#8B9D93] border-b border-[#444]">
                        eat
                      </span>{" "}
                      breakfast.
                    </div>
                    <div className="flex justify-center text-[#8B9D93]">
                      <ChevronRight size={16} className="rotate-90" />
                    </div>
                    <div className="p-3 bg-[#FF6B6B]/5 rounded-lg border-l-2 border-[#FF6B6B] font-mono text-sm">
                      I{" "}
                      <span className="text-[#FF6B6B] font-medium">
                        will have eaten
                      </span>{" "}
                      breakfast.
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                    <div className="flex-1 bg-black/30 rounded-full h-2">
                      <div className="w-3/4 bg-[#FF6B6B] h-full rounded-full" />
                    </div>
                    <span className="text-sm font-mono text-[#FF6B6B]">
                      75%
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap gap-4">
                <ActionButton variant="primary" icon={Play}>
                  Start Session
                </ActionButton>
                <ActionButton variant="secondary" icon={Pause}>
                  Pause
                </ActionButton>
                <ActionButton variant="outline" icon={Settings}>
                  Configure
                </ActionButton>
                <div className="flex-1 max-w-xs">
                  <Input placeholder="Search exercises..." icon={Search} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/10 pt-12 pb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#6FE3B1] to-[#4ECDC4] rounded-lg flex items-center justify-center">
                <Zap size={16} className="text-[#0A0F0D] fill-current" />
              </div>
              <span className="text-lg font-semibold text-white">NCE</span>
            </div>
            <p className="text-sm text-[#8B9D93]">
              © 2026 NCE English Practice. Built with precision.
            </p>
            <div className="flex items-center gap-4">
              <button className="p-2 text-[#8B9D93] hover:text-white transition-colors">
                <Bell size={18} />
              </button>
              <button className="p-2 text-[#8B9D93] hover:text-white transition-colors">
                <User size={18} />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const BentoCard = ({ icon, title, subtitle, children, className = "" }) => (
  <div
    className={`group bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-300 ${className}`}
  >
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-xl bg-[#6FE3B1]/10 flex items-center justify-center text-[#6FE3B1] group-hover:bg-[#6FE3B1]/20 transition-colors">
        {icon}
      </div>
    </div>
    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
    <p className="text-sm text-[#8B9D93] leading-relaxed">{subtitle}</p>
    {children}
  </div>
);

const StatBadge = ({ icon: Icon, value, label }) => (
  <div className="flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
    <Icon size={16} className="text-[#6FE3B1]" />
    <div className="flex flex-col">
      <span className="text-[10px] text-[#8B9D93] uppercase tracking-wider">
        {label}
      </span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  </div>
);

const ActionButton = ({ children, variant = "primary", icon: Icon }) => {
  const variants = {
    primary:
      "bg-[#6FE3B1] text-[#0A0F0D] hover:bg-[#7FF3C1] shadow-lg shadow-[#6FE3B1]/20",
    secondary: "bg-white/5 text-white border border-white/10 hover:bg-white/10",
    outline:
      "bg-transparent text-[#8B9D93] border border-white/10 hover:text-white hover:border-white/20",
  };

  return (
    <button
      className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${variants[variant]}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
};

const Input = ({ placeholder, icon: Icon }) => (
  <div className="relative">
    {Icon && (
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <Icon size={16} className="text-[#8B9D93]" />
      </div>
    )}
    <input
      type="text"
      placeholder={placeholder}
      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-sm text-white placeholder-[#8B9D93] focus:outline-none focus:border-[#6FE3B1]/50 focus:bg-white/[0.08] transition-all"
    />
  </div>
);

export default UnifiedDesignSystem;
