# **构建下一代全平台 Agentic 英语教学系统：基于 React、云原生与通用架构的深度技术报告**

## **1\. 执行摘要与架构愿景**

### **1.1 项目背景与核心目标**

本报告旨在为构建一个高性能、跨平台的“Agentic English Tutor”（智能代理英语导师）提供详尽的技术架构蓝图。该系统的核心价值主张在于通过云端智能，将用户输入的“N+4”难度英语语音，根据上下文语境，实时转化为“N+1”难度的可理解性输入（Comprehensible Input）并反馈给用户。

针对现有技术栈（React \+ Python Web 端）和业务需求（云端语音评测、最大化代码复用、排除鸿蒙系统适配），本报告确立了以 **“通用应用（Universal App）”** 为核心的架构策略。该策略不局限于传统的“Web”或“Native”二元对立，而是通过现代化的构建工具和运行时环境，实现单一代码库（Monorepo）对 Web、iOS、Android 乃至桌面端（macOS/Windows）的全面覆盖 1。

### **1.2 核心架构决策：成熟度与复用性的平衡**

在“方案要成熟”与“尽可能复用”的双重约束下，本报告推荐以下核心技术选型：

1. **移动端与通用运行时：Expo (Managed Workflow \+ CNG)** 采用支持“持续原生生成（Continuous Native Generation, CNG）”的 Expo 托管工作流。这并非早期的 Expo，而是通过 Config Plugins 彻底解决了原生模块限制的现代化方案。它允许团队在不接触 iOS/Android 原生代码文件夹的情况下，集成高性能的原生音频处理库（如 JSI 驱动的录音和 VAD 模块），同时保持 JavaScript 开发体验 3。  
2. **路由与导航：Expo Router** 作为 React Native 生态中首个基于文件系统的路由解决方案，Expo Router 实现了与 Next.js 高度相似的开发范式。它统一了 Web 端的 URL 导航和移动端的堆栈导航（Stack Navigation），是实现“一套代码，多端路由”的关键，极大降低了从 Web 向移动端迁移的学习曲线 2。  
3. **代码复用架构：Turborepo Monorepo** 为了复用现有的 React \+ JS 逻辑和 Python 后端接口，采用 Turborepo 管理 Monorepo 仓库。这种结构允许将现有的 Web 项目（apps/web）与新的移动端项目（apps/mobile）并存，并将 UI 组件、API 客户端、Hooks 等核心逻辑抽离为共享包（packages/ui, packages/logic），实现 90% 以上的业务逻辑复用 8。  
4. **云端交互：WebSocket 全双工流式传输** 鉴于“Agentic”特性对延迟的极高敏感度，传统的 HTTP 请求-响应模式（REST API）无法满足毫秒级的交互需求。架构将采用 WebSocket 实现音频流的实时上传与 TTS（语音合成）流的实时下发，配合云端 Python 服务的异步处理能力，确保对话的流畅性 11。  
5. **端侧智能：Silero VAD 与 JSI** 为了解决云端 VAD（语音活动检测）带来的延迟和带宽消耗，本方案引入 Silero VAD 模型在移动端本地运行。通过 react-native-fast-tflite 和 JSI（JavaScript Interface），在不阻塞 JS 线程的前提下实现毫秒级的人声检测，仅在用户说话时触发云端交互 13。

### **1.3 报告结构导读**

本报告将分为六个主要部分，深入探讨从底层音频工程到上层 UI 复用的每一个技术细节：

* **第二章：通用应用架构深度解析** —— 详述 Expo 生态、Monorepo 设置及路由策略。  
* **第三章：Agentic 核心：低延迟音频工程** —— 剖析 PCM 流处理、本地 VAD 集成及云端同步。  
* **第四章：云端大脑：Python 后端与 N+1 逻辑** —— 设计支持流式处理的后端架构。  
* **第五章：代码复用与迁移指南** —— 提供从现有 React Web 到 Universal App 的具体路径。  
* **第六章：桌面端扩展与未来展望** —— 探讨利用 Tauri 封装 Web 构建以覆盖桌面场景。  
* **第七章：结论与实施路线图**。

## ---

**2\. 通用应用架构深度解析：从 React Web 到 Universal Native**

在 2024 年及未来的技术图谱中，React Native 已不再仅仅是“构建原生应用的 React 绑定”，它演进为了一套跨平台的渲染标准。对于拥有 React Web 资产的团队而言，采用通用架构（Universal Architecture）是实现高复用、低成本迁移的最佳路径。

### **2.1 为什么选择 Expo (CNG) 而非 CLI 或 Capacitor？**

在技术选型阶段，最常见的困惑在于：是使用 React Native CLI（原生开发体验），是使用 Expo（托管体验），还是使用 Capacitor（Webview 包装）。针对本项目的核心卖点——**高实时性语音评测**，选型依据如下：

#### **2.1.1 Capacitor 的局限性**

Capacitor 16 允许开发者直接将 Web 应用打包为移动应用，核心通过 WebView 渲染。虽然这似乎最符合“复用 Web 端”的需求，但在音频处理方面存在致命短板：

* **音频延迟问题**：Capacitor 的音频插件通常基于 Web Audio API 或原生桥接，但在处理实时 PCM 数据流时，WebView 与原生层之间的通信开销（Bridge Overhead）会导致不可忽视的延迟。对于需要精确到毫秒级的语音评测和“打断”功能（Agentic 特性），Capacitor 的性能上限较低 17。  
* **原生能力访问**：虽然 Capacitor 拥有插件生态，但访问深层原生 API（如直接控制音频缓冲区、集成 C++ VAD 模型）往往需要编写复杂的自定义原生插件，这违背了“降低原生开发门槛”的初衷。

#### **2.1.2 Expo CNG 的统治地位**

Expo 的“持续原生生成（Continuous Native Generation）”模式是目前 React Native 生态的黄金标准。

* **零原生代码维护**：团队无需在 git 中提交 ios 或 android 目录。所有的原生配置（权限、SDK 集成、URL Scheme）都通过 app.json 和 Config Plugins 管理。这使得 Web 开发人员可以像配置 Webpack 一样配置原生 App，极大地降低了心智负担 1。  
* **JSI 与高性能音频**：Expo 深度集成了 JSI（JavaScript Interface），允许 JS 直接调用 C++ 宿主函数。这意味着我们可以集成像 react-native-fast-tflite 19 这样的高性能库，直接在端侧运行 AI 模型（VAD），而性能损失几乎可以忽略不计。这是 Capacitor 无法比拟的优势。  
* **生态系统成熟度**：Expo 提供了 expo-av、expo-filesystem 等一系列经过实战检验的标准库，且对第三方库（如 VAD、WebRTC）的兼容性已通过 Config Plugin 体系得到完美解决 20。

**结论**：为了满足“Agentic Tutor”对低延迟音频和端侧智能的硬性需求，**Expo (Managed Workflow with Prebuild)** 是唯一成熟且高性能的选择。

### **2.2 Monorepo 架构：Turborepo 的战略价值**

要实现“现有 React+JS+Python Web 端”与“新移动端”的代码复用，Monorepo（单体仓库）是必经之路。

#### **2.2.1 Turborepo vs Nx**

* **Nx**：功能极其强大，提供深度图分析和自动化生成器，适合超大规模企业级项目。但其严格的规范和复杂的配置对于一个中小型团队（主要目标是复用和跑通功能）来说，可能显得过于厚重，且迁移成本较高 8。  
* **Turborepo**：由 Vercel 维护，核心理念是“高性能构建系统”。它不强制要求特定的代码组织方式，而是通过智能缓存（基于文件哈希）来加速构建。对于熟悉 Next.js 或标准 React 项目的团队，Turborepo 的学习曲线几乎为零。它允许你保留现有的 Web 项目结构，只需添加一个 turbo.json 配置文件即可 9。

#### **2.2.2 推荐的目录结构**

为了最大化复用，建议采用以下结构：

/root

├── apps

│ ├── web (现有的 React Web 项目，逐步迁移至 Next.js 或 Vite)

│ └── mobile (新建的 Expo 项目)

├── packages

│ ├── ui (共享 UI 组件库，基于 React Native Web)

│ ├── logic (共享业务逻辑：API Client, Hooks, Context, State)

│ ├── tsconfig (共享 TypeScript 配置)

│ └── eslint-config (共享 Lint 规则)

├── turbo.json

└── package.json

* **Logic 层复用**：Python 后端的交互逻辑、WebSocket 连接管理、用户状态管理（Redux/Zustand）等 90% 的代码都应放在 packages/logic 中。这些代码纯粹是 JS/TS，不依赖任何 UI 视图，因此可以 100% 在 Web 和 Mobile 间共享。  
* **UI 层复用**：这是最具挑战的部分。通过在 packages/ui 中使用 React Native Primitives (View, Text, Image) 编写组件，并利用 **React Native Web** 26 将其渲染到 Web 端，可以实现“Write Once, Run Everywhere”。

### **2.3 路由策略：Expo Router 的革命性意义**

现有 React Web 应用通常使用 react-router 或 Next.js 的文件系统路由。而传统的 React Native 应用使用 React Navigation（堆栈式路由）。这种范式差异是代码复用的最大障碍。

**Expo Router** 2 的出现消除了这一障碍。它建立在 React Navigation 之上，但提供了类似 Next.js 的基于文件的路由系统。

* **统一的心智模型**：  
  * Web: src/pages/lesson/\[id\].js \-\> URL /lesson/123  
  * Mobile (Expo Router): app/lesson/\[id\].tsx \-\> Deep Link myapp://lesson/123  
* **复用优势**：如果你现有的 Web 端是 React（非 Next.js），迁移到 Expo Router 意味着你需要将路由定义转换为文件结构。如果现有的 Web 端已经是 Next.js，那么 Expo Router 的概念几乎是一一对应的。  
* **深度链接（Deep Linking）**：对于“Agentic”应用，服务端可能需要推送通知：“您的 N+4 挑战报告已生成，点击查看”。Expo Router 自动处理这些深度链接，将其直接映射到对应的应用页面，无需手动解析 URL Schema 2。  
* **Solito 的角色** 27：如果团队坚持在 Web 端使用 Next.js 的高级特性（如 SSR、ISR），那么 **Solito** 是一个很好的补充库。它是一个胶水层，让你在 Web 端使用 Next.js Router，在移动端使用 Expo Router，但共享同一套 Link 组件和导航参数逻辑。考虑到用户提到“现有 Web 端”，如果该端是基于 Create React App 或 Vite，直接迁移到 Expo Router 的 Web 输出可能更简单；如果是 Next.js，则推荐 Expo Router \+ Solito 组合。

## ---

**3\. Agentic 核心：低延迟音频工程与端侧智能**

“Agentic English Tutor”的核心体验在于**对话的流畅性**。如果用户说完话后，系统需要 3-5 秒才能响应（上传录音 \-\> 转码 \-\> STT \-\> LLM \-\> TTS \-\> 下载音频 \-\> 播放），那么“导师”的感觉就会变成“对讲机”。

本方案的目标是将端到端延迟控制在 **1秒以内**，这需要精密的音频工程设计。

### **3.1 音频采集与流式传输 (PCM Streaming)**

#### **3.1.1 为什么不能用文件上传？**

expo-av 等标准库通常将录音保存为 .m4a 或 .wav 文件。文件上传意味着必须等用户说完一整句话，停止录音，然后才开始上传。这是造成延迟的主要原因。

#### **3.1.2 实时 PCM 流方案**

我们必须获取麦克风的原始 PCM（Pulse Code Modulation）数据流，并分片（Chunk）实时发送给 Python 后端。

* **技术选型**：  
  * **Mobile**: 使用 expo-audio-stream（社区库，如 github.com/mykin-ai/expo-audio-stream）或 react-native-audio-pcm-stream 29。这些库提供了直接访问 Audio Buffer 的能力。  
  * **Web**: 使用 Web Audio API 的 AudioWorklet 或 ScriptProcessorNode（旧版但兼容性好）来捕获 PCM 数据 31。  
* **数据格式**：推荐使用 **16kHz, 16-bit, Mono (单声道)**。这是大多数语音识别模型（如 Whisper, Kaldi, Google Speech）的标准输入格式，且带宽占用较低（约 32KB/s）。  
* **传输协议**：使用 **WebSocket**。在连接建立后，客户端源源不断地发送二进制（Binary）音频帧。

### **3.2 端侧语音活动检测 (VAD)：Silero VAD**

“Agentic”意味着系统需要知道**用户何时停止说话**，从而自动触发回应，而不是让用户去点击“停止录音”按钮。

#### **3.2.1 云端 VAD vs 端侧 VAD**

* **云端 VAD**：将所有音频传给服务器，服务器判断静音。  
  * *缺点*：浪费带宽（上传静音数据）、高延迟（需要服务器回传“停止”指令）。  
* **端侧 VAD**：在手机上判断静音，一旦检测到静音超过阈值（如 500ms），立即停止发送并标记“End of Speech”。  
  * *优点*：极低延迟、节省流量、隐私保护。

#### **3.2.2 Silero VAD 的集成**

32  
Silero VAD 是目前业界公认的最佳轻量级 VAD 模型，体积仅 \~2MB，准确率远高于传统的 WebRTC VAD（基于能量检测），特别是在抗噪方面。

* **在 React Native 中的实现**：  
  为了在 JS 线程不卡顿的情况下运行模型，我们需要利用 JSI 和原生 AI 推理引擎。  
  * **库选型**：react-native-fast-tflite 14 或 onnxruntime-react-native 15。鉴于 Silero 官方提供了 ONNX 模型，且 react-native-fast-tflite 在 Expo 生态中通过 Config Plugin 支持良好，推荐将 Silero 模型转换为 .tflite 格式后使用 react-native-fast-tflite 运行。  
  * **工作流**：  
    1. 麦克风采集 PCM 数据块（例如每 30ms 一个块）。  
    2. 通过 JSI 将该数据块传递给 TFLite 解释器。  
    3. TFLite 返回概率值（0\~1）。  
    4. 如果概率持续低于 0.3 超过 500ms，触发 onSilenceDetected 事件。

### **3.3 音频播放与“卡拉OK”式高亮同步**

系统将 N+1 难度的解释反馈给用户时，需要播放语音并高亮对应的单词。这要求音频播放与文本高亮达到帧级同步。

#### **3.3.1 数据协议设计**

Python 后端（TTS 服务）不应只返回音频，还应返回**时间戳对齐数据（Word-Level Timestamps/Alignment）**。

JSON

{  
  "audio\_url": "https://cdn.../response.mp3",  
  "alignment":  
}

#### **3.3.2 播放器选型与实现**

* **播放器**：expo-av 足够胜任。它提供了 setOnPlaybackStatusUpdate 回调，可以以较高频率（如每 50ms）报告当前的播放进度 positionMillis 5。  
* **高亮同步（性能优化）**：  
  * **问题**：如果在 JS 线程中每 50ms setState 一次来更新高亮，会导致 React 频繁 Re-render，在低端安卓机上可能引起卡顿和音频爆音。  
  * **解决方案**：使用 **React Native Reanimated** 的 SharedValue。将 positionMillis 存储为共享值，并在 UI 线程（UI Thread）上根据该值直接驱动文本颜色的变化，完全绕过 JS 桥接。这是一个成熟且高性能的方案 36。

### **3.4 缺失环节：回声消除 (AEC)**

在全双工对话中（用户可以随时打断 Agent），回声消除至关重要。如果 Agent 正在说话，而用户开始说话，麦克风会录入 Agent 的声音，导致模型“听到自己”。

* **现状**：React Native 的标准音频库通常不自带高级 AEC。  
* **对策**：利用 Expo Config Plugin 配置 Android/iOS 的原生语音处理模式。  
  * **iOS**: 设置 AVAudioSessionCategoryPlayAndRecord 并开启 VoiceChat 模式，系统会自动启用硬件级 AEC。  
  * **Android**: 配置 AudioSource.VOICE\_COMMUNICATION。 这些配置可以通过编写简单的 Expo Config Plugin 在构建时注入，无需编写原生代码 5。

## ---

**4\. 云端大脑：Python 后端与 N+1 逻辑架构**

后端不仅是 API 响应者，更是整个“Agentic”体验的编排者（Orchestrator）。

### **4.1 WebSocket 编排服务**

建议使用 **FastAPI** (Python) 配合 websockets 库，或者 **Django Channels**。考虑到现有的 React+Python 栈，FastAPI 因其高性能异步支持（AsyncIO）通常是处理实时音频流的首选。

#### **4.1.1 协议设计**

WebSocket 连接建立后，通信应基于**消息帧**：

* **Input Frames**:  
  * {"type": "config", "sample\_rate": 16000}  
  * Binary Data (音频块)  
  * {"type": "vad\_signal", "status": "end\_of\_speech"} (由端侧 Silero VAD 触发)  
* **Output Frames**:  
  * {"type": "transcription", "text": "..."} (实时 ASR 结果，可选)  
  * {"type": "agent\_thinking"} (告知客户端播放“正在思考”的动效或占位音)  
  * {"type": "audio\_chunk", "data": "base64...", "alignment": \[...\]} (TTS 流式切片)

### **4.2 N+4 到 N+1 的智能处理管线**

这是核心业务逻辑。为了降低延迟，必须采用**流式处理链（Streaming Pipeline）**。

1. **ASR (语音转文字)**：  
   * 接收到音频流后，实时送入 Whisper (OpenAI API 或自托管 Faster-Whisper)。  
   * *优化*：使用 VAD 信号截断音频流，一旦收到 end\_of\_speech，立即结束 ASR 并将文本送入 LLM。  
2. **LLM (Agentic Analysis)**：  
   * **Prompt Engineering**：System Prompt 需要包含“你是一个英语教学专家，用户输入的是 N+4 难度的内容，请分析其语境，并用 N+1 的难度（即略高于用户当前水平但可理解）进行解释。”  
   * **上下文管理**：利用 Redis 缓存用户的历史对话，构建 Prompt 上下文。  
   * **流式输出**：LLM 必须以 Token 流的形式输出，而不是等待整段生成。  
3. **TTS (语音合成)**：  
   * **流式合成**：后端接收到 LLM 的第一个完整句子（通过标点符号判断），立即送入 TTS 引擎（如 Azure TTS, OpenAI TTS, 或 ElevenLabs）。  
   * **并行化**：当 TTS 正在处理第一句时，LLM 正在生成第二句，ASR 已经处理完毕。这种流水线并行（Pipelining）可以将首字延迟（Time to First Audio）压缩到极限。

## ---

**5\. 代码复用与迁移指南：从 Web 到 Universal**

如何将现有的“React+JS+Python Web 端”转化为上述架构？以下是分步实施路径。

### **5.1 第一阶段：Monorepo 搭建与环境准备**

1. **初始化 Turborepo**：  
   Bash  
   npx create-turbo@latest

2. **迁移 Web 应用**：  
   将现有的 React Web 项目代码移动到 apps/web 目录。确保能够通过 pnpm dev 正常启动。  
3. **创建 Expo 项目**：  
   在 apps/mobile 中初始化 Expo：  
   Bash  
   npx create-expo-app@latest \--template tabs@50

   确保启用 expo-router。

### **5.2 第二阶段：UI 组件的“降维”重构**

这是复用工作的核心。Web 端使用的是 HTML DOM (\<div\>, \<span\>, \<img /\>)，而 React Native 使用原生组件 (\<View\>, \<Text\>, \<Image /\>)。

为了复用，我们需要**在 Web 端也使用 React Native 组件**。

1. **引入 NativeWind (Tailwind for RN)**：这允许你使用类似 Tailwind 的类名系统，它在 Web 端编译为 CSS，在 Native 端编译为 StyleSheet。这解决了 80% 的样式复用问题 10。  
2. **重构 UI 库 (packages/ui)**：  
   * 创建一个 Button 组件：  
     TypeScript  
     // packages/ui/Button.tsx  
     import { Pressable, Text } from 'react-native';  
     // 使用 NativeWind 的 className  
     export const Button \= ({ title, onPress }) \=\> (  
       \<Pressable className="bg-blue-500 p-4 rounded" onPress={onPress}\>  
         \<Text className="text-white"\>{title}\</Text\>  
       \</Pressable\>  
     );

   * **在 Web 端使用**：由于 react-native-web 的存在，这个 \<Pressable\> 在 Web 上会自动渲染为 \<div\> 或 \<button\>，并保留点击行为。  
   * **逐步迁移**：不要试图一次性重写所有 Web 页面。先从通用的“原子组件”（按钮、输入框、卡片）开始，逐步向上重构。

### **5.3 第三阶段：业务逻辑抽离 (packages/logic)**

将所有与 UI 无关的代码抽离：

* **API Client**：封装 axios 或 fetch 请求。确保 Base URL 根据环境变化（Web 用相对路径或域名，Mobile 必须用完整 IP/域名）。  
* **State Management**：如果使用 Redux 或 Zustand，将 Store 定义移动到共享包。这些库天然支持多端。  
* **Hooks**：自定义 Hooks（如 useUserSession, useLessonData）是复用的黄金地带。

### **5.4 第四阶段：平台差异化处理**

对于无法复用的部分（主要是录音和音频播放）：

1. **定义接口**：  
   TypeScript  
   // packages/logic/useAudioRecorder.ts  
   export interface AudioRecorder {  
     start: () \=\> Promise\<void\>;  
     stop: () \=\> Promise\<Blob | string\>;  
     isRecording: boolean;  
   }

2. **平台实现**：  
   * 创建 useAudioRecorder.web.ts：使用 MediaRecorder API。  
   * 创建 useAudioRecorder.native.ts：使用 expo-audio-stream。  
3. **自动解析**： 在导入时：import { useAudioRecorder } from './useAudioRecorder'。 React Native 的 Metro Bundler 会自动优先加载 .native.ts，而 Webpack/Vite 会加载 .web.ts 或默认文件。这种机制（Platform-specific extensions）是处理差异的标准成熟方案 39。

## ---

**6\. 桌面端扩展与未来展望**

虽然需求中主要提及 Web 和 Mobile，但“复用”的终极形态是覆盖桌面端。

### **6.1 Tauri：Web 资产的桌面化容器**

现有的 Web 端（经过 React Native Web 重构或保持原样）可以通过 **Tauri** 极低成本地打包为 macOS 和 Windows 应用 40。

* **原理**：Tauri 使用系统自带的 WebView（macOS 上的 WebKit，Windows 上的 WebView2）作为渲染引擎，后端使用 Rust。  
* **优势**：相比 Electron 动辄 100MB+ 的安装包，Tauri 打包出的应用通常小于 10MB。  
* **复用价值**：你可以直接将 apps/web 的构建产物（静态 HTML/JS/CSS）配置为 Tauri 的前端源。这意味着你的“Agentic Tutor”可以瞬间拥有一个原生桌面客户端，供学生在电脑上沉浸式学习。

### **6.2 性能优化建议**

* **Hermes 引擎**：务必在 app.json 中开启 Hermes 引擎。相比 JSC，Hermes 在 Android 上的启动速度快 2 倍，内存占用减半，对低端机极度友好 43。  
* **网络优化**：音频流对网络抖动敏感。建议在 WebSocket 之上实现应用层的心跳检测和自动重连机制（Exponential Backoff）。

## ---

**7\. 结论与实施路线图**

### **7.1 架构总结**

本方案构建了一个以 **Expo (CNG) \+ Expo Router \+ Turborepo** 为基础的通用应用架构。它通过 **React Native Web** 实现了 UI 层的最大化复用，通过 **Silero VAD \+ JSI** 解决了移动端音频处理的延迟和性能瓶颈，并通过 **WebSocket \+ Python 流式处理** 构建了高实时的云端智能。

### **7.2 针对原始需求的响应检查**

1. **云端**：核心 N+4 转 N+1 逻辑、ASR、TTS 均部署在 Python 云端，通过 WebSocket 连接。  
2. **Agentic Tutor**：通过端侧 VAD 实现自然的“对话轮次”切换，配合云端流式响应，达成拟人化的交互体验。  
3. **复用与成熟度**：  
   * **复用**：Turborepo 架构确保了 90% 的逻辑代码和 80% 的 UI 代码共享。  
   * **成熟度**：选用 Expo 托管流、Silero VAD、FastAPI 等均为经过大规模生产验证的技术。  
4. **排除鸿蒙**：所有选型（特别是 JSI 和原生模块）均基于 Android/iOS 标准，未引入任何鸿蒙特定的适配包，符合排除要求。

### **7.3 实施路线图 (Timeline)**

* **Week 1**: 搭建 Turborepo，配置 Expo 环境，迁移纯 JS 业务逻辑。  
* **Week 2**: 在 Mobile 端打通 expo-audio-stream \-\> WebSocket \-\> Python 的全链路，实现回声测试。  
* **Week 3**: 集成 Silero VAD (tflite)，优化静音检测阈值；实现云端 LLM 流式对接。  
* **Week 4**: 开发“卡拉OK”高亮组件 (Reanimated)，完成 UI 适配。  
* **Week 5**: 完善 Web 端适配 (MediaRecorder)，进行多端测试与 EAS Build 配置。

此架构不仅满足当前的快速上线需求，更为未来的桌面端扩展和 AI 模型升级预留了广阔的空间。

#### **引用的著作**

1. Expo, 访问时间为 一月 28, 2026， [https://expo.dev/](https://expo.dev/)  
2. Migrate from React Navigation \- Expo Documentation, 访问时间为 一月 28, 2026， [https://docs.expo.dev/router/migrate/from-react-navigation/](https://docs.expo.dev/router/migrate/from-react-navigation/)  
3. What Is Expo? A Comprehensive Guide for Mobile App Development | MetaCTO, 访问时间为 一月 28, 2026， [https://www.metacto.com/blogs/what-is-expo-a-comprehensive-guide-for-mobile-app-development](https://www.metacto.com/blogs/what-is-expo-a-comprehensive-guide-for-mobile-app-development)  
4. Why Expo is a great fit for new and existing React Native apps, 访问时间为 一月 28, 2026， [https://expo.dev/blog/why-expo-is-a-great-fit-for-new-and-existing-react-native-apps](https://expo.dev/blog/why-expo-is-a-great-fit-for-new-and-existing-react-native-apps)  
5. Audio (expo-audio) \- Expo Documentation, 访问时间为 一月 28, 2026， [https://docs.expo.dev/versions/latest/sdk/audio/](https://docs.expo.dev/versions/latest/sdk/audio/)  
6. Introduction to Expo Router \- Expo Documentation, 访问时间为 一月 28, 2026， [https://docs.expo.dev/router/introduction/](https://docs.expo.dev/router/introduction/)  
7. Migrating from React Navigation to Expo Router \- YouTube, 访问时间为 一月 28, 2026， [https://www.youtube.com/watch?v=NHNb--ISlig](https://www.youtube.com/watch?v=NHNb--ISlig)  
8. Migrating from Turborepo to Nx, 访问时间为 一月 28, 2026， [https://nx.dev/docs/guides/adopting-nx/from-turborepo](https://nx.dev/docs/guides/adopting-nx/from-turborepo)  
9. Why I Chose Turborepo Over Nx: Monorepo Performance Without the Complexity, 访问时间为 一月 28, 2026， [https://dev.to/saswatapal/why-i-chose-turborepo-over-nx-monorepo-performance-without-the-complexity-1afp](https://dev.to/saswatapal/why-i-chose-turborepo-over-nx-monorepo-performance-without-the-complexity-1afp)  
10. cfatrane/monorepo-boilerplate \- GitHub, 访问时间为 一月 28, 2026， [https://github.com/cfatrane/monorepo-boilerplate](https://github.com/cfatrane/monorepo-boilerplate)  
11. From Files to Buffers: Building Real-Time Audio Pipelines in React Native \- Callstack, 访问时间为 一月 28, 2026， [https://www.callstack.com/blog/from-files-to-buffers-building-real-time-audio-pipelines-in-react-native](https://www.callstack.com/blog/from-files-to-buffers-building-real-time-audio-pipelines-in-react-native)  
12. React Native Expo \- Play audio directly from websocket \- Stack Overflow, 访问时间为 一月 28, 2026， [https://stackoverflow.com/questions/60568330/react-native-expo-play-audio-directly-from-websocket](https://stackoverflow.com/questions/60568330/react-native-expo-play-audio-directly-from-websocket)  
13. Real-time audio processing with Expo and native code, 访问时间为 一月 28, 2026， [https://expo.dev/blog/real-time-audio-processing-with-expo-and-native-code](https://expo.dev/blog/real-time-audio-processing-with-expo-and-native-code)  
14. On-device AI/ML in React Native \- Software Mansion, 访问时间为 一月 28, 2026， [https://blog.swmansion.com/on-device-ai-ml-in-react-native-137918d0331b](https://blog.swmansion.com/on-device-ai-ml-in-react-native-137918d0331b)  
15. Deploy any machine learning model for real-time frame processing with React Native Vision Camera and ONNX Runtime. | by Shihara Dilshan | Technoid Community | Medium, 访问时间为 一月 28, 2026， [https://medium.com/technoid-community/deploy-any-machine-learning-model-for-real-time-frame-processing-with-react-native-vision-camera-571fbf2948d1](https://medium.com/technoid-community/deploy-any-machine-learning-model-for-real-time-frame-processing-with-react-native-vision-camera-571fbf2948d1)  
16. Capacitor vs React Native (2025): Which Is Better for Your App? \- NextNative, 访问时间为 一月 28, 2026， [https://nextnative.dev/blog/capacitor-vs-react-native](https://nextnative.dev/blog/capacitor-vs-react-native)  
17. Native calls have a lot of latency (Android) \- Capacitor \- Ionic Forum, 访问时间为 一月 28, 2026， [https://forum.ionicframework.com/t/native-calls-have-a-lot-of-latency-android/243664](https://forum.ionicframework.com/t/native-calls-have-a-lot-of-latency-android/243664)  
18. What is the expected audio latency of AudioTrack playing raw PCM audio from memory? : r/androiddev \- Reddit, 访问时间为 一月 28, 2026， [https://www.reddit.com/r/androiddev/comments/15rlyvn/what\_is\_the\_expected\_audio\_latency\_of\_audiotrack/](https://www.reddit.com/r/androiddev/comments/15rlyvn/what_is_the_expected_audio_latency_of_audiotrack/)  
19. mrousavy/react-native-fast-tflite: High-performance TensorFlow Lite library for React Native with GPU acceleration \- GitHub, 访问时间为 一月 28, 2026， [https://github.com/mrousavy/react-native-fast-tflite](https://github.com/mrousavy/react-native-fast-tflite)  
20. Expo quickstart \- LiveKit Documentation, 访问时间为 一月 28, 2026， [https://docs.livekit.io/transport/sdk-platforms/expo/](https://docs.livekit.io/transport/sdk-platforms/expo/)  
21. Deploying WebRTC on an Expo React Native app \- Daily.co, 访问时间为 一月 28, 2026， [https://www.daily.co/blog/deploying-webrtc-on-an-expo-react-native-app-2/](https://www.daily.co/blog/deploying-webrtc-on-an-expo-react-native-app-2/)  
22. Choosing monorepo tooling: nx.dev vs Turborepo for a green field projects in 2022 | by Sergey Dubovyk | Medium, 访问时间为 一月 28, 2026， [https://medium.com/@knidarkness/nx-dev-vs-turborepo-for-a-green-field-projects-in-2022-c73dd858b687](https://medium.com/@knidarkness/nx-dev-vs-turborepo-for-a-green-field-projects-in-2022-c73dd858b687)  
23. NX vs Turborepo? Concerned about betting on either : r/reactjs \- Reddit, 访问时间为 一月 28, 2026， [https://www.reddit.com/r/reactjs/comments/yhzf3f/nx\_vs\_turborepo\_concerned\_about\_betting\_on\_either/](https://www.reddit.com/r/reactjs/comments/yhzf3f/nx_vs_turborepo_concerned_about_betting_on_either/)  
24. What's the best choice for a scalable dashboard (Next.js or Remix) and monorepo setup (Turborepo or Nx) for web \+ Expo mobile apps? : r/reactnative \- Reddit, 访问时间为 一月 28, 2026， [https://www.reddit.com/r/reactnative/comments/1k8f378/whats\_the\_best\_choice\_for\_a\_scalable\_dashboard/](https://www.reddit.com/r/reactnative/comments/1k8f378/whats_the_best_choice_for_a_scalable_dashboard/)  
25. Start with an example \- Turborepo, 访问时间为 一月 28, 2026， [https://turborepo.dev/docs/getting-started/examples](https://turborepo.dev/docs/getting-started/examples)  
26. From Web to Native with React \- Expo, 访问时间为 一月 28, 2026， [https://expo.dev/blog/from-web-to-native-with-react](https://expo.dev/blog/from-web-to-native-with-react)  
27. Comparison between solito and expo-router · nandorojo solito · Discussion \#428 \- GitHub, 访问时间为 一月 28, 2026， [https://github.com/nandorojo/solito/discussions/428](https://github.com/nandorojo/solito/discussions/428)  
28. Story: How We Build Native & Web Apps Using the Same Codebase \- Nimble, 访问时间为 一月 28, 2026， [https://www.nimblestudio.com/story/how-we-build-native-web-apps-using-the-same-codebase](https://www.nimblestudio.com/story/how-we-build-native-web-apps-using-the-same-codebase)  
29. mybigday/react-native-audio-pcm-stream \- GitHub, 访问时间为 一月 28, 2026， [https://github.com/mybigday/react-native-audio-pcm-stream](https://github.com/mybigday/react-native-audio-pcm-stream)  
30. mykin-ai/expo-audio-stream \- GitHub, 访问时间为 一月 28, 2026， [https://github.com/mykin-ai/expo-audio-stream](https://github.com/mykin-ai/expo-audio-stream)  
31. cordova-plugin-audioinput \- NPM, 访问时间为 一月 28, 2026， [https://www.npmjs.com/package/cordova-plugin-audioinput](https://www.npmjs.com/package/cordova-plugin-audioinput)  
32. frymanofer/ReactNative\_VAD: VAD Voice Activation Detection for react native \- GitHub, 访问时间为 一月 28, 2026， [https://github.com/frymanofer/ReactNative\_vad](https://github.com/frymanofer/ReactNative_vad)  
33. Silero VAD: pre-trained enterprise-grade Voice Activity Detector \- GitHub, 访问时间为 一月 28, 2026， [https://github.com/snakers4/silero-vad](https://github.com/snakers4/silero-vad)  
34. Choosing the Best Voice Activity Detection in 2025: Cobra vs Silero vs WebRTC VAD, 访问时间为 一月 28, 2026， [https://picovoice.ai/blog/best-voice-activity-detection-vad-2025/](https://picovoice.ai/blog/best-voice-activity-detection-vad-2025/)  
35. Sound player with controls and streaming : r/expo \- Reddit, 访问时间为 一月 28, 2026， [https://www.reddit.com/r/expo/comments/16ezjzg/sound\_player\_with\_controls\_and\_streaming/](https://www.reddit.com/r/expo/comments/16ezjzg/sound_player_with_controls_and_streaming/)  
36. Building a Reusable Custom Text Component in React Native | by Sanjin Sehic \- Medium, 访问时间为 一月 28, 2026， [https://medium.com/scaleuptech/building-a-reusable-custom-text-component-in-react-native-0cedab9ae3fe](https://medium.com/scaleuptech/building-a-reusable-custom-text-component-in-react-native-0cedab9ae3fe)  
37. Custom Component in React Native \- YouTube, 访问时间为 一月 28, 2026， [https://www.youtube.com/watch?v=CshTI9had0s](https://www.youtube.com/watch?v=CshTI9had0s)  
38. gluestack-ui · GitHub Topics, 访问时间为 一月 28, 2026， [https://github.com/topics/gluestack-ui](https://github.com/topics/gluestack-ui)  
39. Solito 5 is now web-first (but still unifies NextJS and React Native) \- DEV Community, 访问时间为 一月 28, 2026， [https://dev.to/redbar0n/solito-5-is-now-web-first-but-still-unifies-nextjs-and-react-native-2lek](https://dev.to/redbar0n/solito-5-is-now-web-first-but-still-unifies-nextjs-and-react-native-2lek)  
40. Support for Windows and MacOs apps development · expo expo · Discussion \#22273 \- GitHub, 访问时间为 一月 28, 2026， [https://github.com/expo/expo/discussions/22273](https://github.com/expo/expo/discussions/22273)  
41. React Native App Targeting Mobile, Web & Desktop With Expo & Tauri \- Netguru, 访问时间为 一月 28, 2026， [https://www.netguru.com/blog/react-native-expo-tauri](https://www.netguru.com/blog/react-native-expo-tauri)  
42. Tauri v2 with Next.js for cross-platform apps : r/reactjs \- Reddit, 访问时间为 一月 28, 2026， [https://www.reddit.com/r/reactjs/comments/1idfyex/tauri\_v2\_with\_nextjs\_for\_crossplatform\_apps/](https://www.reddit.com/r/reactjs/comments/1idfyex/tauri_v2_with_nextjs_for_crossplatform_apps/)  
43. Hermes vs V8 vs JSI: The JavaScript Engine Decision That Could Make or Break Your React Native App | by Dikhyant Krishna Dalai | Medium, 访问时间为 一月 28, 2026， [https://medium.com/@dikhyantkrishnadalai/hermes-vs-v8-vs-jsi-the-javascript-engine-decision-that-could-make-or-break-your-react-native-app-cffda46570cc](https://medium.com/@dikhyantkrishnadalai/hermes-vs-v8-vs-jsi-the-javascript-engine-decision-that-could-make-or-break-your-react-native-app-cffda46570cc)