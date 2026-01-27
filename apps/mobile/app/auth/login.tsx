// apps/mobile/app/auth/login.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/AuthContext";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      // The context will automatically handle the redirect in useEffect
    } catch (e: any) {
      console.error("Login failed", e);
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background justify-center p-6">
      <View className="items-center mb-8">
        <Text className="text-3xl font-bold text-primary mb-2">NCE Mobile</Text>
        <Text className="text-text-muted">
          Sign in to continue your practice
        </Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className="text-text mb-2 font-medium">Email</Text>
          <TextInput
            className="bg-surface text-text p-4 rounded-xl border border-gray-700"
            placeholder="Enter your email"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View>
          <Text className="text-text mb-2 font-medium">Password</Text>
          <TextInput
            className="bg-surface text-text p-4 rounded-xl border border-gray-700"
            placeholder="Enter your password"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {error && (
          <Text className="text-red-500 text-sm text-center">{error}</Text>
        )}

        <TouchableOpacity
          className={`bg-primary p-4 rounded-xl items-center mt-4 ${
            loading ? "opacity-70" : ""
          }`}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
