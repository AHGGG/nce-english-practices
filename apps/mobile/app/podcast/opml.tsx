import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { podcastApi } from "@nce/api";
import {
  writeAsStringAsync,
  cacheDirectory,
  EncodingType,
} from "expo-file-system/legacy";
import { ChevronLeft, Upload, Download } from "lucide-react-native";

export default function PodcastOpmlScreen() {
  const router = useRouter();
  const [importText, setImportText] = useState("");
  const [exportText, setExportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const xml = await podcastApi.exportOPMLText();
      setExportText(xml);
    } catch (e: any) {
      Alert.alert("Export failed", e?.message || "Unknown error");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    const content = importText.trim();
    if (!content) {
      Alert.alert("Empty content", "Paste OPML XML first.");
      return;
    }

    setImporting(true);
    try {
      const fileUri = `${cacheDirectory || ""}podcasts-import.opml`;
      await writeAsStringAsync(fileUri, content, {
        encoding: EncodingType.UTF8,
      });
      const result = await podcastApi.importOPMLFromFile(fileUri);
      Alert.alert(
        "Import complete",
        `Imported ${result?.imported ?? 0}, skipped ${result?.skipped ?? 0}, failed ${result?.failed ?? 0}`,
      );
    } catch (e: any) {
      Alert.alert("Import failed", e?.message || "Unknown error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="h-14 flex-row items-center px-4 border-b border-border-default bg-bg-surface">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={24} color="#E0E0E0" />
        </TouchableOpacity>
        <Text className="text-text-primary font-bold ml-2">
          OPML Import/Export
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View className="bg-bg-surface border border-border-default rounded-xl p-4 mb-4">
          <View className="flex-row items-center mb-2">
            <Upload size={16} color="#00FF94" />
            <Text className="text-text-primary font-bold ml-2">
              Import OPML
            </Text>
          </View>
          <Text className="text-text-muted text-xs mb-3">
            Paste OPML XML and import subscriptions.
          </Text>
          <TextInput
            value={importText}
            onChangeText={setImportText}
            multiline
            className="bg-bg-base border border-border-default rounded-lg p-3 text-text-primary min-h-[180px]"
            placeholder={'<?xml version="1.0" ...>'}
            placeholderTextColor="#666"
          />
          <TouchableOpacity
            onPress={handleImport}
            disabled={importing}
            className="mt-3 py-2 rounded-lg bg-accent-primary/10 border border-accent-primary/30 items-center"
          >
            {importing ? (
              <ActivityIndicator size="small" color="#00FF94" />
            ) : (
              <Text className="text-accent-primary text-xs font-bold uppercase">
                Import
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="bg-bg-surface border border-border-default rounded-xl p-4">
          <View className="flex-row items-center mb-2">
            <Download size={16} color="#00E0FF" />
            <Text className="text-text-primary font-bold ml-2">
              Export OPML
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleExport}
            disabled={exporting}
            className="py-2 rounded-lg bg-accent-info/10 border border-accent-info/30 items-center mb-3"
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#00E0FF" />
            ) : (
              <Text className="text-accent-info text-xs font-bold uppercase">
                Generate Export
              </Text>
            )}
          </TouchableOpacity>

          <TextInput
            value={exportText}
            editable={false}
            multiline
            className="bg-bg-base border border-border-default rounded-lg p-3 text-text-secondary min-h-[180px]"
            placeholder="Exported XML will appear here"
            placeholderTextColor="#666"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
