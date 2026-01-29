import { View, Text, ScrollView, ActivityIndicator } from "react-native";

interface Props {
  inspectorData: any;
  contextExplanation?: string | null;
  isLoading?: boolean;
}

export function DictionaryResultView({
  inspectorData,
  contextExplanation,
  isLoading,
}: Props) {
  if (isLoading && !inspectorData) {
    return (
      <View className="flex-1 justify-center items-center p-8">
        <ActivityIndicator size="large" color="#00FF94" />
        <Text className="text-text-muted mt-4 font-mono text-xs">
          SEARCHING...
        </Text>
      </View>
    );
  }

  if (!inspectorData && !contextExplanation && !isLoading) {
    return (
      <View className="flex-1 justify-center items-center p-8 opacity-50">
        <Text className="text-text-muted text-center">
          Enter a word to see definitions from Longman and Collins dictionaries.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Dictionary Entries */}
      {inspectorData && (
        <View className="mb-8">
          {/* Word Header if not shown elsewhere */}
          <Text className="text-3xl font-serif font-bold text-text-primary mb-6">
            {inspectorData.word}
          </Text>

          {/* LDOCE */}
          {inspectorData.ldoce?.found && (
            <View className="mb-8">
              <View className="flex-row items-center mb-4">
                <View className="h-4 w-1 bg-accent-info mr-2 rounded-full" />
                <Text className="text-accent-info font-bold text-xs uppercase tracking-wider font-mono">
                  Longman Dictionary
                </Text>
              </View>
              {inspectorData.ldoce.senses
                ?.slice(0, 5)
                .map((sense: any, i: number) => (
                  <View
                    key={i}
                    className="mb-6 pl-3 border-l border-border-subtle"
                  >
                    <Text className="text-text-primary text-lg font-serif leading-7 mb-2">
                      {sense.definition?.en}
                    </Text>
                    {sense.examples?.map((ex: any, j: number) => (
                      <Text
                        key={j}
                        className="text-text-secondary italic text-sm mt-1 leading-5"
                      >
                        "{ex.text}"
                      </Text>
                    ))}
                  </View>
                ))}
            </View>
          )}

          {/* Collins */}
          {inspectorData.collins?.found && (
            <View className="mb-6">
              <View className="flex-row items-center mb-4">
                <View className="h-4 w-1 bg-accent-warning mr-2 rounded-full" />
                <Text className="text-accent-warning font-bold text-xs uppercase tracking-wider font-mono">
                  Collins COBUILD
                </Text>
              </View>
              {inspectorData.collins.senses
                ?.slice(0, 5)
                .map((sense: any, i: number) => (
                  <View
                    key={i}
                    className="mb-4 pl-3 border-l border-border-subtle"
                  >
                    <Text className="text-text-primary text-base font-serif leading-6">
                      {sense.definition?.en}
                    </Text>
                  </View>
                ))}
            </View>
          )}
        </View>
      )}

      {/* AI Context */}
      {contextExplanation && (
        <View className="bg-bg-surface p-5 rounded-xl border border-accent-success/30 mb-8">
          <Text className="text-accent-success font-bold mb-3 text-xs uppercase tracking-wider font-mono">
            AI Context Analysis
          </Text>
          <Text className="text-text-primary leading-7 font-serif text-base">
            {contextExplanation}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
