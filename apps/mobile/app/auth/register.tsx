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

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useAuthStore((state) => state.register);
  const router = useRouter();

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      setError("Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await register(email, password, username || undefined);
      // Navigation is handled by RootLayout listening to auth state
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginLink = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/auth/login");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-base justify-center px-6">
      <View className="mb-10">
        <Text className="text-3xl font-serif text-text-primary mb-2">
          Create Account
        </Text>
        <Text className="text-text-secondary">
          Join the practice and track your progress
        </Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className="text-text-secondary text-xs mb-1 uppercase tracking-wider">
            Email *
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
            Username (Optional)
          </Text>
          <TextInput
            className="bg-bg-surface border border-border-default rounded-lg p-4 text-text-primary font-mono"
            placeholder="Display Name"
            placeholderTextColor="#666"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
        </View>

        <View className="mt-4">
          <Text className="text-text-secondary text-xs mb-1 uppercase tracking-wider">
            Password *
          </Text>
          <TextInput
            className="bg-bg-surface border border-border-default rounded-lg p-4 text-text-primary font-mono"
            placeholder="Minimum 8 characters"
            placeholderTextColor="#666"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <View className="mt-4">
          <Text className="text-text-secondary text-xs mb-1 uppercase tracking-wider">
            Confirm Password *
          </Text>
          <TextInput
            className="bg-bg-surface border border-border-default rounded-lg p-4 text-text-primary font-mono"
            placeholder="Re-enter password"
            placeholderTextColor="#666"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        {error && (
          <Text className="text-accent-danger text-sm mt-2">{error}</Text>
        )}

        <TouchableOpacity
          className={`bg-accent-primary p-4 rounded-lg mt-6 items-center ${
            loading ? "opacity-70" : ""
          }`}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="black" />
          ) : (
            <Text className="text-black font-bold uppercase tracking-wider">
              Create Account
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-6 items-center py-2"
          onPress={handleLoginLink}
        >
          <Text className="text-text-secondary">
            Already have an account?{" "}
            <Text className="text-accent-primary">Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
