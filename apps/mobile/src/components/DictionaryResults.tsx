import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Volume2, ChevronDown, ChevronRight } from "lucide-react-native";

const RevealableTranslation = ({ text }: { text?: string }) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!text) return null;

  if (isVisible) {
    return (
      <Text
        className="text-text-muted text-xs mt-1"
        onPress={() => setIsVisible(false)}
      >
        {text}
      </Text>
    );
  }

  return (
    <TouchableOpacity
      className="flex-row items-center gap-1.5 mt-1"
      onPress={() => setIsVisible(true)}
    >
      <Text className="text-text-muted text-xs">Translate</Text>
    </TouchableOpacity>
  );
};

const EntryHeader = ({ entry, source }: { entry: any; source: string }) => (
  <View className="px-4 py-3 bg-bg-elevated border-b border-border flex-row items-center gap-3 flex-wrap">
    <Text className="font-bold text-text-primary">{entry.headword}</Text>
    {entry.homnum && (
      <Text className="text-xs text-text-muted">#{entry.homnum}</Text>
    )}
    {entry.part_of_speech && (
      <View className="px-2 py-0.5 bg-neon-purple/20 rounded">
        <Text className="text-neon-purple text-xs">{entry.part_of_speech}</Text>
      </View>
    )}
    {entry.pronunciation && (
      <Text className="text-text-secondary text-sm font-mono">
        /{entry.pronunciation}/
      </Text>
    )}
    {(entry.pronunciation_uk || entry.pronunciation_us) && (
      <View className="flex-row gap-2 text-sm">
        {entry.pronunciation_uk && (
          <Text className="text-text-secondary font-mono">
            UK: /{entry.pronunciation_uk}/
          </Text>
        )}
        {entry.pronunciation_us && (
          <Text className="text-text-secondary font-mono">
            US: /{entry.pronunciation_us}/
          </Text>
        )}
      </View>
    )}
  </View>
);

const SenseItem = ({ sense, index }: { sense: any; index: number }) => (
  <View className="space-y-2">
    <View className="flex-row items-start gap-2">
      <View className="w-6 h-6 rounded-full bg-accent-primary/20 items-center justify-center">
        <Text className="text-accent-primary text-xs font-bold">{index}</Text>
      </View>
      <View className="flex-1">
        {sense.grammar && (
          <Text className="text-text-secondary text-xs mr-2">
            {sense.grammar}
          </Text>
        )}
        <Text className="text-text-primary">{sense.definition}</Text>
        <RevealableTranslation text={sense.definition_cn} />
      </View>
    </View>
    {sense.examples && sense.examples.length > 0 && (
      <View className="ml-8 space-y-2">
        {sense.examples.map((ex: any, exIdx: number) => (
          <View key={exIdx} className="pl-3 border-l-2 border-border">
            <Text className="text-text-primary italic text-sm">{ex.text}</Text>
            <RevealableTranslation text={ex.translation} />
          </View>
        ))}
      </View>
    )}
  </View>
);

const PhrasalVerbs = ({ phrasalVerbs }: { phrasalVerbs: any[] }) => (
  <View className="mt-4 pt-4 border-t border-border">
    <Text className="text-xs uppercase text-text-muted tracking-wider mb-2">
      Phrasal Verbs
    </Text>
    <View className="space-y-2">
      {phrasalVerbs.map((pv, pvIdx) => (
        <View key={pvIdx} className="p-2 bg-bg-elevated rounded">
          <Text className="font-bold text-accent-primary">{pv.phrase}</Text>
          <Text className="text-text-primary ml-2">{pv.definition}</Text>
          <RevealableTranslation text={pv.definition_cn} />
        </View>
      ))}
    </View>
  </View>
);

const Collocations = ({ collocations }: { collocations: any[] }) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <View className="mt-4 pt-4 border-t border-border">
      <Text className="text-xs uppercase text-text-muted tracking-wider mb-2">
        Collocations ({collocations.length})
      </Text>
      <View className="space-y-2">
        {collocations.slice(0, 10).map((col, colIdx) => (
          <View
            key={colIdx}
            className="border-l-2 border-accent-primary/30 pl-3"
          >
            <TouchableOpacity
              className="flex-row items-center gap-2 w-full"
              onPress={() =>
                setExpandedIdx(expandedIdx === colIdx ? null : colIdx)
              }
            >
              <Text className="text-xs">
                {expandedIdx === colIdx ? "▼" : "▶"}
              </Text>
              <View className="flex-1 px-2 py-0.5 bg-accent-primary/20 rounded">
                <Text className="text-accent-primary text-sm">
                  {col.pattern}
                </Text>
              </View>
              {col.part_of_speech && (
                <Text className="text-text-muted text-xs">
                  {col.part_of_speech}
                </Text>
              )}
            </TouchableOpacity>
            {expandedIdx === colIdx &&
              col.examples &&
              col.examples.length > 0 && (
                <View className="ml-4 mt-2 space-y-2">
                  {col.examples.map((ex: any, exIdx: number) => (
                    <View key={exIdx} className="pl-3 border-l-2 border-border">
                      <Text className="text-text-primary text-sm italic">
                        {ex.text}
                      </Text>
                      <RevealableTranslation text={ex.translation} />
                    </View>
                  ))}
                </View>
              )}
          </View>
        ))}
      </View>
    </View>
  );
};

const VerbTable = ({ verbTable }: { verbTable: any }) => {
  const [expanded, setExpanded] = useState(false);

  if (!verbTable) return null;

  return (
    <View className="mt-4 pt-4 border-t border-border">
      <TouchableOpacity
        className="flex-row items-center gap-2"
        onPress={() => setExpanded(!expanded)}
      >
        <Text className="text-xs">{expanded ? "▼" : "▶"}</Text>
        <Text className="text-xs uppercase text-text-muted tracking-wider">
          Verb Table
        </Text>
      </TouchableOpacity>
      {expanded && (
        <View className="mt-2 p-3 bg-bg-elevated rounded">
          {verbTable.simple_forms && verbTable.simple_forms.length > 0 && (
            <View className="mb-3">
              <Text className="text-text-secondary text-xs mb-1">
                Simple Forms
              </Text>
              <View className="grid grid-cols-2 gap-1">
                {verbTable.simple_forms
                  .slice(0, 6)
                  .map((f: any, fIdx: number) => (
                    <View key={fIdx} className="flex-row gap-2">
                      <Text className="text-text-muted w-20 text-xs">
                        {f.tense}
                      </Text>
                      <Text className="text-accent-primary text-xs">
                        {f.auxiliary && (
                          <Text className="text-text-secondary">
                            {f.auxiliary}{" "}
                          </Text>
                        )}
                        {f.form}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const ThesaurusSection = ({ thesaurus }: { thesaurus: any }) => {
  const [expanded, setExpanded] = useState(false);

  if (!thesaurus) return null;

  return (
    <View className="mt-4 pt-4 border-t border-border">
      <TouchableOpacity
        className="flex-row items-center gap-2"
        onPress={() => setExpanded(!expanded)}
      >
        <Text className="text-xs">{expanded ? "▼" : "▶"}</Text>
        <Text className="text-xs uppercase text-text-muted tracking-wider">
          Thesaurus
        </Text>
        {thesaurus.topic && (
          <Text className="text-text-secondary normal-case">
            ({thesaurus.topic})
          </Text>
        )}
      </TouchableOpacity>
      {expanded && (
        <View className="mt-2 p-3 bg-bg-elevated rounded space-y-3">
          {thesaurus.entries && thesaurus.entries.length > 0 && (
            <View className="space-y-2">
              {thesaurus.entries.slice(0, 8).map((te: any, teIdx: number) => (
                <View key={teIdx} className="border-l-2 border-border pl-3">
                  <Text className="text-accent-info font-medium">
                    {te.word}
                  </Text>
                  {te.definition && (
                    <Text className="text-text-secondary text-sm">
                      - {te.definition}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
          {thesaurus.word_sets && thesaurus.word_sets.length > 0 && (
            <View className="flex-row flex-wrap gap-1 mt-2">
              {thesaurus.word_sets
                .slice(0, 20)
                .map((ws: string, wsIdx: number) => (
                  <View
                    key={wsIdx}
                    className="px-2 py-0.5 bg-bg-surface rounded"
                  >
                    <Text className="text-text-secondary text-xs">{ws}</Text>
                  </View>
                ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const DictionaryResults = ({
  word,
  source,
  entries = [],
}: {
  word: string;
  source: string;
  entries: any[];
}) => {
  if (!entries || entries.length === 0) {
    return (
      <View className="p-4 bg-bg-elevated border border-border rounded">
        <Text className="text-text-muted">
          Loading dictionary data for{" "}
          <Text className="text-text-primary font-bold">{word}</Text>...
        </Text>
      </View>
    );
  }

  return (
    <View className="space-y-4">
      {entries.map((entry, idx) => (
        <View
          key={idx}
          className="bg-bg-surface border border-border rounded-lg overflow-hidden"
        >
          <EntryHeader entry={entry} source={source} />

          <View className="p-4 space-y-4">
            {entry.senses &&
              entry.senses.map((sense: any, sIdx: number) => (
                <SenseItem key={sIdx} sense={sense} index={sIdx + 1} />
              ))}

            {entry.phrasal_verbs && entry.phrasal_verbs.length > 0 && (
              <PhrasalVerbs phrasalVerbs={entry.phrasal_verbs} />
            )}

            <Collocations collocations={entry.collocations || []} />
            <VerbTable verbTable={entry.verb_table} />
            <ThesaurusSection thesaurus={entry.thesaurus} />
          </View>
        </View>
      ))}
    </View>
  );
};

export default DictionaryResults;
