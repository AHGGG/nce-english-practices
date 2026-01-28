import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Modal, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useReviewQueue, useWordExplainer } from "@nce/shared";
import { RotateCcw, CheckCircle, Zap, Volume2, BookOpen, RefreshCw, ChevronRight, X, PlayCircle } from "lucide-react-native";
import { useState, useRef, useEffect } from "react";
import { Audio } from 'expo-av';
import { getApiBaseUrl } from "../../src/lib/platform-init";

// --- Components ---

const NativeHighlightedSentence = ({ 
  text, 
  highlights = [], 
  clickable = false, 
  onWordClick 
}: { 
  text: string, 
  highlights?: string[], 
  clickable?: boolean, 
  onWordClick?: (word: string, context: string) => void 
}) => {
  if (!highlights || highlights.length === 0) {
    return <Text className="text-2xl text-text-primary font-serif leading-relaxed text-center">{text}</Text>;
  }

  const pattern = highlights.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);

  return (
    <Text className="text-2xl text-text-primary font-serif leading-relaxed text-center">
      {parts.map((part, i) => {
        const isHighlight = highlights.some(h => h.toLowerCase() === part.toLowerCase());
        if (isHighlight) {
          return (
            <Text
              key={i}
              className={`text-category-amber font-bold ${clickable ? 'underline' : ''}`}
              onPress={clickable && onWordClick ? () => onWordClick(part, text) : undefined}
            >
              {part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
};

// Simplified Word Inspector Modal
const InspectorModal = ({ 
  visible, 
  onClose, 
  data, 
  word,
  onPlayAudio 
}: { 
  visible: boolean, 
  onClose: () => void, 
  data: any, 
  word: string | null,
  onPlayAudio: (text: string) => void
}) => {
  if (!visible || !data) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-bg-elevated rounded-t-3xl h-[80%] p-6 w-full border-t border-border-default">
           {/* Header */}
           <View className="flex-row justify-between items-center mb-6">
             <View className="flex-row items-baseline space-x-2">
               <Text className="text-3xl font-serif font-bold text-accent-primary">{data.headword || word}</Text>
               <TouchableOpacity onPress={() => onPlayAudio(data.headword || word)}>
                 <Volume2 size={20} color="#00FF94" />
               </TouchableOpacity>
             </View>
             <TouchableOpacity onPress={onClose} className="p-2 bg-bg-surface rounded-full">
               <X size={24} color="#A0A0A0" />
             </TouchableOpacity>
           </View>

           <ScrollView showsVerticalScrollIndicator={false}>
             {/* Definitions */}
             {data.senses?.map((sense: any, idx: number) => (
               <View key={idx} className="mb-6 bg-bg-surface p-4 rounded-xl border border-border-default">
                 {sense.grammar && (
                   <Text className="text-accent-info text-xs font-mono mb-1 bg-accent-info/10 self-start px-2 py-0.5 rounded">
                     {sense.grammar}
                   </Text>
                 )}
                 <Text className="text-text-primary text-base font-medium mb-2">{sense.definition}</Text>
                 {sense.chinese_definition && (
                   <Text className="text-text-secondary text-sm mb-3">{sense.chinese_definition}</Text>
                 )}
                 {/* Examples */}
                 {sense.examples?.slice(0, 2).map((ex: any, exIdx: number) => (
                   <View key={exIdx} className="pl-3 border-l-2 border-border-subtle mt-2">
                     <Text className="text-text-muted text-sm italic">{ex.text || ex}</Text>
                   </View>
                 ))}
               </View>
             ))}
           </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function ReviewScreen() {
  const { 
    queue, loading, currentItem, currentIndex, stats,
    handleRating, handleUndoRedo, undoState,
    refreshQueue,
    showContext, toggleContext, contextData, loadingContext,
    showHelpPanel, helpContent, helpStage, isLoadingHelp,
    handleForgot, handleHelpResponse, handleSkipHelp
  } = useReviewQueue();

  const {
    selectedWord,
    inspectorData,
    isInspecting,
    handleWordClick,
    closeInspector
  } = useWordExplainer();

  // Audio Logic
  const soundRef = useRef<Audio.Sound | null>(null);

  const playAudio = async (text: string) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const baseUrl = getApiBaseUrl();
      const url = `${baseUrl}/api/tts?text=${encodeURIComponent(text)}`;
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: url }, 
        { shouldPlay: true }
      );
      soundRef.current = sound;
    } catch (e) {
      console.error("Failed to play audio", e);
    }
  };

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-bg-base">
        <ActivityIndicator color="#00FF94" size="large" />
      </View>
    );
  }

  if (queue.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-bg-base items-center justify-center p-6">
        <CheckCircle size={64} color="#00FF94" />
        <Text className="text-text-primary text-xl font-serif mt-4">All Caught Up!</Text>
        <Text className="text-text-secondary text-center mt-2 mb-8">
          You've finished your reviews for now.
        </Text>
        <TouchableOpacity 
          className="flex-row items-center bg-accent-primary/10 px-6 py-3 rounded-full border border-accent-primary/30"
          onPress={refreshQueue}
        >
          <RefreshCw size={16} color="#00FF94" />
          <Text className="text-accent-primary font-bold ml-2">Refresh Queue</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!currentItem) return null;

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4 border-b border-border-default bg-bg-surface">
        <View>
           <Text className="text-text-primary font-bold">REVIEW QUEUE</Text>
           <Text className="text-text-muted text-[10px]">
             {currentIndex + 1} / {queue.length} • Due: {stats.due_items}
           </Text>
        </View>
        <View className="flex-row space-x-4">
           {undoState && (
             <TouchableOpacity onPress={handleUndoRedo}>
               <RotateCcw size={20} color={undoState.mode === 'redo' ? "#00FF94" : "#A0A0A0"} 
                 style={undoState.mode === 'redo' ? { transform: [{ scaleX: -1 }] } : undefined} 
               />
             </TouchableOpacity>
           )}
           <TouchableOpacity onPress={refreshQueue}>
             <RefreshCw size={20} color="#A0A0A0" />
           </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Card */}
        <View className="bg-bg-surface p-6 rounded-2xl border border-border-default min-h-[300px]">
          
          {/* Context Toggle */}
          <View className="flex-row justify-end mb-4 space-x-2">
             <TouchableOpacity 
               className="bg-bg-elevated p-2 rounded-lg"
               onPress={() => playAudio(currentItem.sentence_text)}
             >
               <Volume2 size={16} color="#E0E0E0" />
             </TouchableOpacity>
             <TouchableOpacity 
               className={`p-2 rounded-lg ${showContext ? 'bg-accent-info/20' : 'bg-bg-elevated'}`}
               onPress={toggleContext}
             >
               {loadingContext ? <ActivityIndicator size="small" color="#00E0FF" /> : <BookOpen size={16} color={showContext ? "#00E0FF" : "#E0E0E0"} />}
             </TouchableOpacity>
          </View>

          {/* Context View */}
          {showContext && contextData && (
             <View className="mb-6 p-4 bg-bg-elevated rounded-xl border border-border-subtle">
                {contextData.previous_sentence && <Text className="text-text-muted text-sm mb-2">{contextData.previous_sentence}</Text>}
                <View className="border-l-2 border-accent-info pl-2 my-2">
                  <Text className="text-text-primary font-medium">{contextData.target_sentence}</Text>
                </View>
                {contextData.next_sentence && <Text className="text-text-muted text-sm mt-2">{contextData.next_sentence}</Text>}
             </View>
          )}

          {/* Target Sentence */}
          <View className="flex-1 justify-center items-center py-8">
            <NativeHighlightedSentence 
               text={currentItem.sentence_text} 
               highlights={currentItem.highlighted_items}
               clickable={showHelpPanel}
               onWordClick={handleWordClick}
            />
            {showHelpPanel && currentItem.highlighted_items.length > 0 && (
              <Text className="text-accent-primary text-[10px] uppercase font-bold mt-4">
                Tap highlighted words to look up
              </Text>
            )}
          </View>

          {/* Interval Info */}
          <View className="border-t border-border-subtle pt-4 items-center">
            <Text className="text-text-muted text-xs">
              Review #{currentItem.repetition + 1} • Interval: {Math.round(currentItem.interval_days)} days
            </Text>
          </View>
        </View>

        {/* Help Panel Content */}
        {showHelpPanel && (
           <View className="mt-6 bg-bg-elevated p-4 rounded-xl border border-border-default">
              <View className="flex-row items-center mb-2">
                 <Zap size={16} color="#F59E0B" />
                 <Text className="text-accent-warning font-bold ml-2 uppercase text-xs">AI Assistance (Stage {helpStage}/4)</Text>
              </View>
              {isLoadingHelp && !helpContent ? (
                 <ActivityIndicator color="#F59E0B" className="py-4" />
              ) : (
                 <Text className="text-text-secondary leading-relaxed font-sans">{helpContent}</Text>
              )}
           </View>
        )}

      </ScrollView>

      {/* Buttons Area */}
      <View className="absolute bottom-0 left-0 right-0 p-6 bg-bg-base border-t border-border-default">
         {showHelpPanel ? (
           <View>
              <View className="flex-row space-x-4 mb-3">
                 <TouchableOpacity 
                   className="flex-1 bg-bg-surface border border-border-default py-4 rounded-xl items-center"
                   onPress={() => handleHelpResponse(false)} // Still Unclear / Next Stage
                 >
                    <Text className="text-text-primary font-bold">Still Unclear</Text>
                    <Text className="text-text-muted text-[10px] uppercase">Next Stage</Text>
                 </TouchableOpacity>
                 <TouchableOpacity 
                   className="flex-1 bg-accent-primary/10 border border-accent-primary/30 py-4 rounded-xl items-center"
                   onPress={() => handleHelpResponse(true)} // Remembered
                 >
                    <Text className="text-accent-primary font-bold">Remembered</Text>
                    <Text className="text-accent-primary/70 text-[10px] uppercase">Mark as Hard</Text>
                 </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleSkipHelp} className="items-center">
                 <Text className="text-text-muted text-xs">Skip, I really forgot</Text>
              </TouchableOpacity>
           </View>
         ) : (
           <View className="flex-row justify-between space-x-4">
              <TouchableOpacity 
                 className="flex-1 bg-accent-danger/10 py-4 rounded-2xl items-center justify-center border border-accent-danger/30"
                 onPress={handleForgot}
              >
                 <RotateCcw color="#FF0055" size={24} />
                 <Text className="text-accent-danger text-xs mt-2 font-bold uppercase">Forgot</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                 className="flex-1 bg-accent-primary/10 py-4 rounded-2xl items-center justify-center border border-accent-primary/30"
                 onPress={() => handleRating(3)}
              >
                 <CheckCircle color="#00FF94" size={24} />
                 <Text className="text-accent-primary text-xs mt-2 font-bold uppercase">Good</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                 className="flex-1 bg-accent-warning/10 py-4 rounded-2xl items-center justify-center border border-accent-warning/30"
                 onPress={() => handleRating(5)}
              >
                 <Zap color="#F59E0B" size={24} />
                 <Text className="text-accent-warning text-xs mt-2 font-bold uppercase">Easy</Text>
              </TouchableOpacity>
           </View>
         )}
      </View>

      {/* Word Inspector Modal */}
      <InspectorModal 
         visible={isInspecting} 
         onClose={closeInspector} 
         data={inspectorData}
         word={selectedWord}
         onPlayAudio={playAudio}
      />

    </SafeAreaView>
  );
}
