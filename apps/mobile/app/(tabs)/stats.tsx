import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePerformanceStats, formatDuration, formatWordCount } from "@nce/shared";
import { Clock, BookOpen, FileText, Target, Brain, AlertTriangle, Lightbulb } from "lucide-react-native";
import { useState } from "react";
import { Svg, Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";

// --- Simple Memory Curve Chart (SVG) ---
const MemoryCurveChart = ({ data }: { data: any }) => {
  const actual = data?.actual || [];
  const ebbinghaus = data?.ebbinghaus || [];
  
  if (!actual.length) return null;

  const width = Dimensions.get("window").width - 80; // Padding
  const height = 150;
  const padding = 20;

  // Scale data
  const maxDay = Math.max(
      ...actual.map((d: any) => d.day),
      ...ebbinghaus.map((d: any) => d.day)
  ) || 30;

  const getX = (day: number) => (day / maxDay) * width + padding;
  const getY = (retention: number) => height - (retention * (height - padding * 2)) - padding;

  // Build Paths
  const buildPath = (points: any[], isDashed = false) => {
      if (!points.length) return "";
      let d = `M ${getX(points[0].day)} ${getY(points[0].retention || 0)}`;
      points.forEach((p: any) => {
          if (p.retention !== null) {
              d += ` L ${getX(p.day)} ${getY(p.retention)}`;
          }
      });
      return d;
  };

  const ebbinghausPath = buildPath(ebbinghaus);
  const actualPath = buildPath(actual.filter((p: any) => p.retention !== null));

  return (
    <View className="h-[180px] items-center justify-center">
        <Svg width={width + 40} height={height}>
            <Defs>
                <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#00FF94" stopOpacity="0.3" />
                    <Stop offset="1" stopColor="#00FF94" stopOpacity="0" />
                </LinearGradient>
            </Defs>
            
            {/* Ebbinghaus Curve (Dashed/Gray) */}
            <Path 
                d={ebbinghausPath} 
                stroke="#666666" 
                strokeWidth="2" 
                strokeDasharray="5, 5" 
                fill="none" 
            />

            {/* Actual Curve (Green) */}
            <Path 
                d={actualPath} 
                stroke="#00FF94" 
                strokeWidth="3" 
                fill="none"
            />
            
            {/* Dots */}
            {actual.map((p: any, i: number) => (
                p.retention !== null && (
                    <Circle 
                        key={i} 
                        cx={getX(p.day)} 
                        cy={getY(p.retention)} 
                        r="3" 
                        fill="#00FF94" 
                        stroke="#050505"
                        strokeWidth="1"
                    />
                )
            ))}
        </Svg>
        <View className="flex-row justify-between w-full px-4 mt-2">
            <Text className="text-text-muted text-[10px]">Day 0</Text>
            <Text className="text-text-muted text-[10px]">Day {maxDay}</Text>
        </View>
    </View>
  );
};

// --- Main Screen ---
export default function StatsScreen() {
  const [days, setDays] = useState(30);
  const { stats, profile, isLoading } = usePerformanceStats(days);

  if (isLoading || !stats) {
    return (
      <View className="flex-1 justify-center items-center bg-bg-base">
        <ActivityIndicator size="large" color="#00FF94" />
      </View>
    );
  }

  const { study_time, reading_stats, memory_curve } = stats;

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
            <Text className="text-text-primary text-2xl font-bold font-serif">Analytics</Text>
            
            {/* Date Selector */}
            <View className="flex-row bg-bg-surface rounded-lg border border-border-default overflow-hidden">
                {[7, 30, 90].map((d) => (
                    <TouchableOpacity 
                        key={d}
                        onPress={() => setDays(d)}
                        className={`px-3 py-1.5 ${days === d ? 'bg-accent-primary' : 'bg-transparent'}`}
                    >
                        <Text className={`text-xs font-mono font-bold ${days === d ? 'text-bg-base' : 'text-text-muted'}`}>
                            {d}D
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>

        {/* KPI Grid */}
        <View className="flex-row flex-wrap justify-between gap-y-4 mb-6">
            {/* Time */}
            <View className="w-[48%] bg-bg-surface p-4 rounded-xl border border-border-default">
                <Clock size={20} color="#00FF94" className="mb-2 opacity-70" />
                <Text className="text-2xl font-mono font-bold text-accent-primary">
                    {formatDuration(study_time?.total_minutes || 0)}
                </Text>
                <Text className="text-text-muted text-xs">Study Time</Text>
            </View>

            {/* Words */}
            <View className="w-[48%] bg-bg-surface p-4 rounded-xl border border-border-default">
                <BookOpen size={20} color="#00FF94" className="mb-2 opacity-70" />
                <Text className="text-2xl font-mono font-bold text-accent-primary">
                    {formatWordCount(reading_stats?.total_words || 0)}
                </Text>
                <Text className="text-text-muted text-xs">Words Read</Text>
            </View>

            {/* Articles */}
            <View className="w-[48%] bg-bg-surface p-4 rounded-xl border border-border-default">
                <FileText size={20} color="#00FF94" className="mb-2 opacity-70" />
                <Text className="text-2xl font-mono font-bold text-accent-primary">
                    {reading_stats?.articles_count || 0}
                </Text>
                <Text className="text-text-muted text-xs">Articles</Text>
            </View>

            {/* Clear Rate */}
            <View className="w-[48%] bg-bg-surface p-4 rounded-xl border border-border-default">
                <Target size={20} color="#00FF94" className="mb-2 opacity-70" />
                <Text className="text-2xl font-mono font-bold text-accent-primary">
                    {profile ? Math.round((profile.clear_rate || 0) * 100) : 0}%
                </Text>
                <Text className="text-text-muted text-xs">Clear Rate</Text>
            </View>
        </View>

        {/* Memory Curve */}
        <View className="bg-bg-surface p-4 rounded-2xl border border-border-default mb-6">
            <View className="flex-row items-center mb-4">
                <Brain size={20} color="#00E0FF" className="mr-2" />
                <Text className="text-text-primary font-bold">Memory Curve</Text>
            </View>
            <MemoryCurveChart data={memory_curve} />
        </View>

        {/* Weakness Analysis */}
        {profile && profile.unclear_count > 0 && (
            <View className="bg-bg-surface p-4 rounded-2xl border border-border-default mb-6">
                <View className="flex-row items-center mb-4">
                    <AlertTriangle size={20} color="#F59E0B" className="mr-2" />
                    <Text className="text-text-primary font-bold">Problem Distribution</Text>
                </View>
                
                <View className="space-y-4">
                     {[
                         { label: 'Vocabulary', count: profile.vocab_gap_count, color: 'bg-accent-primary' },
                         { label: 'Grammar', count: profile.grammar_gap_count, color: 'bg-accent-danger' },
                         { label: 'Meaning', count: profile.meaning_gap_count, color: 'bg-accent-warning' },
                         { label: 'Collocation', count: profile.collocation_gap_count, color: 'bg-accent-info' },
                     ].map((item, idx) => (
                         <View key={idx} className="flex-row items-center">
                             <Text className="text-text-primary text-xs w-20">{item.label}</Text>
                             <View className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden mr-3">
                                 <View 
                                    className={`h-full ${item.color}`} 
                                    style={{ width: `${Math.min((item.count / profile.unclear_count) * 100, 100)}%` }} 
                                 />
                             </View>
                             <Text className="text-text-muted text-xs w-6 text-right">{item.count}</Text>
                         </View>
                     ))}
                </View>
            </View>
        )}

        {/* Insights */}
        {profile?.insights && profile.insights.length > 0 && (
             <View className="bg-accent-primary/5 p-4 rounded-2xl border border-accent-primary/20 mb-6">
                <View className="flex-row items-center mb-2">
                    <Lightbulb size={20} color="#00FF94" className="mr-2" />
                    <Text className="text-accent-primary font-bold">Insights</Text>
                </View>
                {profile.insights.map((insight: string, idx: number) => (
                    <Text key={idx} className="text-text-secondary text-sm mb-2 font-serif leading-relaxed">
                        • {insight}
                    </Text>
                ))}
            </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
