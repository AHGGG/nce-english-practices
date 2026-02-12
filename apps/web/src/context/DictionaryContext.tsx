/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import DictionaryModal from "../components/Dictionary/DictionaryModal";

interface DictionaryContextValue {
  openDictionary: (selectedWord: string, context?: string | null) => void;
  closeDictionary: () => void;
}

const DictionaryContext = createContext<DictionaryContextValue | null>(null);

export const useDictionary = (): DictionaryContextValue => {
  const context = useContext(DictionaryContext);
  if (!context) {
    throw new Error("useDictionary must be used within DictionaryProvider");
  }
  return context;
};

export const DictionaryProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [word, setWord] = useState<string | null>(null);
  const [contextSentence, setContextSentence] = useState<string | null>(null);

  const openDictionary = (
    selectedWord: string,
    context: string | null = null,
  ) => {
    setWord(selectedWord);
    setContextSentence(context);
    setIsOpen(true);
  };

  const closeDictionary = () => {
    setIsOpen(false);
    setWord(null);
    setContextSentence(null);
  };

  return (
    <DictionaryContext.Provider value={{ openDictionary, closeDictionary }}>
      {children}
      <DictionaryModal
        isOpen={isOpen}
        onClose={closeDictionary}
        word={word ?? undefined}
        contextSentence={contextSentence ?? undefined}
      />
    </DictionaryContext.Provider>
  );
};
