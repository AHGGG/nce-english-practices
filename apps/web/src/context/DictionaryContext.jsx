/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';
import DictionaryModal from '../components/Dictionary/DictionaryModal';

const DictionaryContext = createContext();

export const useDictionary = () => useContext(DictionaryContext);

export const DictionaryProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [word, setWord] = useState(null);
    const [contextSentence, setContextSentence] = useState(null);

    const openDictionary = (selectedWord, context = null) => {
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
                word={word}
                contextSentence={contextSentence}
            />
        </DictionaryContext.Provider>
    );
};
