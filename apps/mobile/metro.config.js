const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.disableHierarchicalLookup = true;

// 4. Web-specific aliases to mock native-only modules
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Web platform aliasing for native-only packages
  if (platform === "web") {
    // react-native-webview -> react-native-web-webview
    if (moduleName === "react-native-webview") {
      return {
        filePath: require.resolve("react-native-web-webview"),
        type: "sourceFile",
      };
    }

    // lucide-react-native -> lucide-react (Web-compatible)
    if (moduleName === "lucide-react-native") {
      return {
        filePath: require.resolve("lucide-react"),
        type: "sourceFile",
      };
    }
  }

  // Fallback to original resolver
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
