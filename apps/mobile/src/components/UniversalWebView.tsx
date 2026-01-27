import React, { forwardRef } from "react";
import { Platform } from "react-native";
// We import types only, which is safe for Web bundling (erased at runtime)
import type {
  WebView as NativeWebViewType,
  WebViewProps,
} from "react-native-webview";

// Lazy load to avoid Web bundling issues if this file is accidentally parsed
let NativeWebView: any;
if (Platform.OS !== "web") {
  try {
    NativeWebView = require("react-native-webview").WebView;
  } catch (e) {
    console.warn("UniversalWebView: Failed to load native webview", e);
  }
}

export const UniversalWebView = forwardRef<NativeWebViewType, WebViewProps>(
  (props, ref) => {
    if (!NativeWebView) {
      return null;
    }
    return <NativeWebView ref={ref} {...props} />;
  },
);
