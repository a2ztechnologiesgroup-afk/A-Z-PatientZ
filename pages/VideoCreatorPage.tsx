

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { SparkleIcon, SpinnerIcon, WarningIcon } from '../components/Icons';

// This is an external dependency provided by the execution environment.
declare const window: any;

interface VideoCreatorPageProps {
  onGoHome: () => void;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error('Failed to convert blob to base64.'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const POLLING_MESSAGES = [
    "Warming up the video synthesizer...",
    "Teaching pixels how to dance...",
    "Composing a digital symphony...",
    "Reticulating splines...",
    "Gathering stardust for the final render...",
    "This is taking a moment, your masterpiece is brewing...",
    "Almost there, polishing the final frames...",
];

// Fix: Corrected typo in interface name from 'VideoCreatorPagePageProps' to 'VideoCreatorPageProps'.
const VideoCreatorPage: React.FC<VideoCreatorPageProps> = ({ onGoHome }) => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [generationState, setGenerationState] = useState<'idle' | 'generating' | 'polling' | 'success' | 'error'>('idle');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pollingMessage, setPollingMessage] = useState(POLLING_MESSAGES[0]);

    useEffect(() => {
        const checkApiKey = async () => {
            if (await window.aistudio.hasSelectedApiKey()) {
                setApiKeySelected(true);
            }
        };
        checkApiKey();
    }, []);

    useEffect(() => {
        let interval: number;
        if (generationState === 'polling') {
            interval = window.setInterval(() => {
                setPollingMessage(prev => {
                    const currentIndex = POLLING_MESSAGES.indexOf(prev);
                    const nextIndex = (currentIndex + 1) % POLLING_MESSAGES.length;
                    return POLLING_MESSAGES[nextIndex];
                });
            }, 7000);
        }
        return () => clearInterval(interval);
    }, [generationState]);

    const handleSelectKey = async () => {
        await window.aistudio.openSelectKey();
        setApiKeySelected(true);
    };

    const handleImageUpload = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            handleStartOver();
            setImageFile(file);
            setImageUrl(URL.createObjectURL(file));
        } else {
            setError('Please upload a valid image file (e.g., JPG, PNG).');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleImageUpload(e.target.files[0]);
        }
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageUpload(e.dataTransfer.files[0]);
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError("A text prompt is required to generate a video.");
            return;
        }

        setGenerationState('generating');
        setError(null);
        setVideoUrl(null);

        try {
            // Fix: Create a new GoogleGenAI instance right before making an API call
            // to ensure it always uses the most up-to-date API key from the dialog.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const payload: any = {
                model: 'veo-3.1-fast-generate-preview',
                prompt: prompt,
                config: {
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio: aspectRatio,
                }
            };

            if (imageFile) {
                const base64Data = await blobToBase64(imageFile);
                payload.image = {
                    imageBytes: base64Data,
                    mimeType: imageFile.type,
                };
            }

            let operation = await ai.models.generateVideos(payload);
            setGenerationState('polling');

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            if (operation.error) throw new Error(operation.error.message);

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) throw new Error("Video generation completed, but no download link was found.");
            
            const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!videoResponse.ok) throw new Error(`Failed to download video file: ${videoResponse.statusText}`);
            
            const videoBlob = await videoResponse.blob();
            const generatedVideoUrl = URL.createObjectURL(videoBlob);
            
            setVideoUrl(generatedVideoUrl);
            setGenerationState('success');

        } catch (err: any) { // Fix: Changed type from 'unknown' to 'any' to address compiler error on this line.
            console.error('Video generation failed:', err);
            // Fix: Ensure the error message is always a string by explicitly casting err.
            const errorMessage = err instanceof Error ? err.message : String(err);
            
            // Check for API key error and prompt user to re-select.
            if (errorMessage.includes("Requested entity was not found.")) {
                setError("Your API Key appears to be invalid. Please select a valid key and try again.");
                setApiKeySelected(false);
            } else {
                setError(errorMessage);
            }
            setGenerationState('error');
        }
    };
    
    const handleStartOver = () => {
        if (imageUrl) URL.revokeObjectURL(imageUrl);
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        setImageFile(null);
        setImageUrl(null);
        setPrompt('');
        setVideoUrl(null);
        setError(null);
        setGenerationState('idle');
        if(fileInputRef.current) fileInputRef.current.value = '';
    };
    
    const handleDownload = () => {
        if (videoUrl) {
            const link = document.createElement('a');
            link.href = videoUrl;
            link.download = `generated_video.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    
    if (!apiKeySelected) {
        return (
            <div className="flex-grow flex col items-center justify-center p-8 text-center glassmorphism rounded-xl shadow-2xl animate-fade-in">
                <WarningIcon className="w-16 h-16 text-amber-400 mb-4" />
                <h2 className="text-2xl font-bold text-slate-50">API Key Required</h2>
                <p className="text-slate-300 mt-2 max-w-lg">Video generation with Veo requires a dedicated API key. Please select your key to continue. Billing is handled by Google AI Studio.</p>
                <p className="text-sm text-slate-400 mt-2">For more information, visit <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-300">ai.google.dev/gemini-api/docs/billing</a>.</p>
                <button
                    onClick={handleSelectKey}
                    className="mt-6 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors"
                >
                    Select API Key
                </button>
            </div>
        );
    }

    const isLoading = generationState === 'generating' || generationState === 'polling';
    
    return (
        <div className="flex-grow flex flex-col min-h-0 glassmorphism rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-y-auto custom-scrollbar-dark">
                {/* Input Panel */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-bold text-slate-100">1. Add an Image (Optional)</h2>
                    {imageUrl ? (
                        <div className="relative group">
                            <img src={imageUrl} alt="Uploaded" className="w-full rounded-lg" />
                            <button onClick={handleStartOver} className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                        </div>
                    ) : (
                        <div 
                            className="w-full h-48 border-2 border-dashed border-slate-500 rounded-lg flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-purple-400 hover:bg-white/5 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            <p>Click or drag & drop to upload</p>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                        </div>
                    )}
                    
                    <h2 className="text-xl font-bold text-slate-100 mt-2">2. Describe Your Video</h2>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., A majestic lion roaring on a cliff at sunset"
                        className="w-full h-24 p-3 glass-input rounded-md shadow-sm resize-none"
                        disabled={isLoading}
                    />

                    <h2 className="text-xl font-bold text-slate-100 mt-2">3. Select Aspect Ratio</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setAspectRatio('16:9')} disabled={isLoading} className={`p-3 rounded-lg border-2 ${aspectRatio === '16:9' ? 'border-purple-500 bg-purple-500/20' : 'border-slate-600 hover:border-slate-400'}`}>
                            16:9 (Landscape)
                        </button>
                        <button onClick={() => setAspectRatio('9:16')} disabled={isLoading} className={`p-3 rounded-lg border-2 ${aspectRatio === '9:16' ? 'border-purple-500 bg-purple-500/20' : 'border-slate-600 hover:border-slate-400'}`}>
                            9:16 (Portrait)
                        </button>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || isLoading}
                        className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <SpinnerIcon className="w-5 h-5" /> : <SparkleIcon className="w-5 h-5" />}
                        <span>{generationState === 'idle' || generationState === 'success' || generationState === 'error' ? 'Generate Video' : 'Generating...'}</span>
                    </button>
                </div>

                {/* Output Panel */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-bold text-slate-100">Result</h2>
                    <div className="flex-grow w-full min-h-[300px] bg-black/20 rounded-lg p-2 flex items-center justify-center">
                        {isLoading ? (
                            <div className="text-center">
                                <SpinnerIcon className="w-12 h-12 text-purple-400 mx-auto" />
                                <p className="mt-4 text-slate-300 font-semibold">{generationState === 'generating' ? 'Starting generation...' : 'Polling for results...'}</p>
                                <p className="mt-2 text-slate-400 text-sm">{pollingMessage}</p>
                            </div>
                        ) : error ? (
                            <div className="text-center text-red-400 p-4">
                                <WarningIcon className="w-12 h-12 mx-auto" />
                                <p className="mt-4 font-semibold">An Error Occurred</p>
                                <p className="text-sm mt-1">{error}</p>
                            </div>
                        ) : videoUrl ? (
                             <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain rounded-lg" />
                        ) : (
                            <div className="text-center text-slate-500">
                                <p>Your generated video will appear here</p>
                            </div>
                        )}
                    </div>
                     {(videoUrl || error) && !isLoading && (
                        <div className="grid grid-cols-2 gap-4 animate-fade-in">
                             <button onClick={handleStartOver} className="w-full px-6 py-3 bg-white/10 text-slate-100 font-semibold rounded-lg shadow-sm hover:bg-white/20 transition-colors">Start Over</button>
                             <button onClick={handleDownload} disabled={!videoUrl} className="w-full px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors disabled:opacity-50">Download</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoCreatorPage;