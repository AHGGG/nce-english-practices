import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Volume2, Gauge, Settings, Layout, Type } from 'lucide-react';
import { useGlobalState } from '../context/GlobalContext';

// --- Reusable Components for Scalability ---

const SettingsSection = ({ title, icon: Icon, children }) => (
    <div className="bg-bg-surface border border-border p-6 rounded-lg relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-accent-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <h2 className="text-lg font-bold font-serif mb-6 flex items-center gap-2">
            <Icon className="w-5 h-5 text-accent-primary" />
            {title}
        </h2>
        
        <div className="space-y-8 divide-y divide-border/30">
            {children}
        </div>
    </div>
);

const SettingsRow = ({ title, description, children }) => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-6 first:pt-0">
        <div className="flex-1">
            <h3 className="font-medium text-text-primary text-base">{title}</h3>
            <p className="text-xs text-text-muted mt-1 max-w-lg leading-relaxed">
                {description}
            </p>
        </div>
        <div className="shrink-0 flex items-center">
            {children}
        </div>
    </div>
);

const Toggle = ({ value, onChange }) => (
    <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-base ${
            value ? 'bg-accent-primary' : 'bg-bg-elevated border border-text-muted'
        }`}
    >
        <span
            className={`${
                value ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
        />
    </button>
);

const Select = ({ options, value, onChange }) => (
    <div className="flex flex-wrap items-center gap-2 bg-bg-base rounded-lg p-1.5 border border-border">
        {options.map((opt) => (
            <button
                key={opt}
                onClick={() => onChange(opt)}
                className={`px-3 py-1.5 text-xs font-mono rounded transition-all active:scale-95 ${
                    value === opt
                        ? 'bg-accent-primary text-black font-bold shadow-[0_0_10px_rgba(0,255,148,0.3)]'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                }`}
            >
                {typeof opt === 'number' ? `${opt}x` : opt}
            </button>
        ))}
    </div>
);

// --- Main Page ---

const SettingsPage = () => {
    const navigate = useNavigate();
    const { state: { settings }, actions: { updateSetting } } = useGlobalState();

    const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

    return (
        <div className="min-h-screen bg-bg-base text-text-primary p-4 md:p-8">
            <div className="max-w-2xl mx-auto pb-20">
                {/* Header */}
                <header className="mb-8 flex items-center gap-4">
                    <button
                        onClick={() => navigate('/nav')}
                        className="p-2 -ml-2 text-text-muted hover:text-accent-primary transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-text-primary flex items-center gap-3">
                            <Settings className="w-8 h-8 text-accent-primary" />
                            System Configuration
                        </h1>
                        <p className="text-sm text-text-muted font-mono mt-1">
                            // PREFERENCES_AND_DEFAULTS
                        </p>
                    </div>
                </header>

                <div className="space-y-6">
                    {/* General Settings */}
                    <SettingsSection title="General Preferences" icon={Volume2}>
                        <SettingsRow 
                            title="Auto-Pronunciation"
                            description="Automatically play audio pronunciation when clicking words in Reading Mode or Sentence Study."
                        >
                            <Toggle 
                                value={settings.autoPronounce} 
                                onChange={(val) => updateSetting('autoPronounce', val)} 
                            />
                        </SettingsRow>
                    </SettingsSection>

                    {/* Podcast Settings */}
                    <SettingsSection title="Podcast Defaults" icon={Gauge}>
                        <SettingsRow 
                            title="Default Playback Speed"
                            description="Set the preferred playback speed for all podcast episodes. This will be applied when starting a new episode."
                        >
                            <Select 
                                options={SPEED_OPTIONS} 
                                value={settings.podcastSpeed} 
                                onChange={(val) => updateSetting('podcastSpeed', val)} 
                            />
                        </SettingsRow>
                    </SettingsSection>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
