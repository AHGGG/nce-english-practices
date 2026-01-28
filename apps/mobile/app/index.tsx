import { View, Text } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-gray-100">
      <Text className="text-2xl font-bold text-blue-600 mb-4">
        NativeWind is Working!
      </Text>
      <Text className="text-base text-gray-500">
        Official Monorepo Config + NativeWind v4
      </Text>
    </View>
  );
}
