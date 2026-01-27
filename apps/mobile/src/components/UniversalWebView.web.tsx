import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from "react";
import { View } from "react-native";

// Mock types for Web compatibility
export interface WebViewProps {
  source?: { html: string };
  onMessage?: (event: any) => void;
  style?: any;
  containerStyle?: any;
  originWhitelist?: string[];
  showsVerticalScrollIndicator?: boolean;
}

export const UniversalWebView = forwardRef((props: WebViewProps, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useImperativeHandle(ref, () => ({
    injectJavaScript: (js: string) => {
      if (iframeRef.current?.contentWindow) {
        try {
          // Execute JS in the iframe context
          (iframeRef.current.contentWindow as any).eval(js);
        } catch (e) {
          console.error("Failed to inject JS into iframe", e);
        }
      }
    },
    stopLoading: () => {},
    goForward: () => {},
    goBack: () => {},
    reload: () => {},
  }));

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // In a real app, verify origin!
      if (typeof event.data === "string") {
        try {
          // Ensure it looks like our message
          const parsed = JSON.parse(event.data);
          if (parsed.type) {
            props.onMessage?.({ nativeEvent: { data: event.data } });
          }
        } catch (e) {
          // Ignore non-JSON messages
        }
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [props.onMessage]);

  return (
    <View style={[{ flex: 1, overflow: "hidden" }, props.containerStyle]}>
      <iframe
        ref={iframeRef}
        srcDoc={props.source?.html}
        style={{
          border: "none",
          width: "100%",
          height: "100%",
          backgroundColor: "transparent",
        }}
        // Allow scripts
        sandbox="allow-scripts allow-same-origin"
      />
    </View>
  );
});
