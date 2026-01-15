/**
 * BookShelfView - Book Selection Grid
 * Shows all available EPUB books for Sentence Study
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, BookOpen, Loader2, GraduationCap } from 'lucide-react';

const BookShelfView = ({
    books = [],
    loading = false,
    onSelectBook
}) => {
    const navigate = useNavigate();

    return (
        <div className="h-screen flex flex-col bg-bg-base text-text-primary font-mono">
            <header className="h-14 border-b border-border flex items-center px-4 md:px-8 bg-bg-elevated">
                <button
                    onClick={() => navigate('/nav')}
                    className="flex items-center gap-2 text-text-secondary hover:text-accent-primary transition-colors mr-3"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <GraduationCap className="w-5 h-5 text-accent-primary mr-3" />
                <h1 className="text-sm font-bold uppercase tracking-wider">Sentence Study Library</h1>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-2xl mx-auto">
                    <p className="text-text-secondary text-sm mb-6">
                        Select a book to start studying.
                    </p>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {books.map((book, i) => (
                                <button
                                    key={i}
                                    onClick={() => onSelectBook(book)}
                                    className="text-left p-6 border border-border bg-bg-surface hover:border-accent-primary hover:bg-accent-primary/5 transition-all group flex flex-col h-full"
                                >
                                    <BookOpen className="w-8 h-8 text-text-muted group-hover:text-accent-primary mb-4" />
                                    <h3 className="font-serif text-xl text-text-primary group-hover:text-accent-primary mb-2 line-clamp-2">
                                        {book.title}
                                    </h3>
                                    <div className="mt-auto pt-4 flex items-center justify-between text-xs text-text-muted">
                                        <span>EPUB</span>
                                        <span>{(book.size_bytes / 1024 / 1024).toFixed(1)} MB</span>
                                    </div>
                                </button>
                            ))}

                            {books.length === 0 && (
                                <div className="col-span-full text-center py-12 text-text-muted">
                                    No books found in library.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default BookShelfView;
