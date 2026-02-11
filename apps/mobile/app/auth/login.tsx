import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "@nce/store";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) return;

    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      // Navigation is handled by RootLayout listening to auth state
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-base justify-center px-6">
      <View className="mb-10">
        <Text className="text-3xl font-serif text-text-primary mb-2">
          Welcome Back
        </Text>
        <Text className="text-text-secondary">
          Sign in to continue your practice
        </Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className="text-text-secondary text-xs mb-1 uppercase tracking-wider">
            Email
          </Text>
          <TextInput
            className="bg-bg-surface border border-border-default rounded-lg p-4 text-text-primary font-mono"
            placeholder="user@example.com"
            placeholderTextColor="#666"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View className="mt-4">
          <Text className="text-text-secondary text-xs mb-1 uppercase tracking-wider">
            Password
          </Text>
          <TextInput
            className="bg-bg-surface border border-border-default rounded-lg p-4 text-text-primary font-mono"
            placeholder="••••••••"
            placeholderTextColor="#666"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {error && (
          <Text className="text-accent-danger text-sm mt-2">{error}</Text>
        )}

        <TouchableOpacity
          className={`bg-accent-primary p-4 rounded-lg mt-6 items-center ${loading ? "opacity-70" : ""}`}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="black" />
          ) : (
            <Text className="text-black font-bold uppercase tracking-wider">
              Sign In
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-6 items-center py-2"
          onPress={() => router.push("/auth/register")}
        >
          <Text className="text-text-secondary">
            Don't have an account?{" "}
            <Text className="text-accent-primary">Create One</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
