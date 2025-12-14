import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { SparkleIcon, SpinnerIcon, WarningIcon } from '../components/Icons';

interface ImageEditorPageProps {
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

const ImageEditorPage: React.FC<ImageEditorPageProps> = ({ onGoHome }) => {
    const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
    const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            handleStartOver(); // Clear previous results
            setOriginalImageFile(file);
            setOriginalImageUrl(URL.createObjectURL(file));
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
        if (!originalImageFile || !prompt.trim()) {
            setError('Please upload an image and enter a prompt.');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setEditedImageUrl(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const base64Data = await blobToBase64(originalImageFile);

            const imagePart = {
                inlineData: {
                    mimeType: originalImageFile.type,
                    data: base64Data,
                },
            };

            const textPart = {
                text: prompt,
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [imagePart, textPart] },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });
            
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                    setEditedImageUrl(imageUrl);
                    return;
                }
            }
            throw new Error("No image was generated in the response.");

        } catch (err) {
            console.error('Error generating image:', err);
            setError('Failed to edit the image. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleStartOver = () => {
        if (originalImageUrl) {
            URL.revokeObjectURL(originalImageUrl);
        }
        setOriginalImageFile(null);
        setOriginalImageUrl(null);
        setPrompt('');
        setEditedImageUrl(null);
        setError(null);
        setIsLoading(false);
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    const handleDownload = () => {
        if (editedImageUrl) {
            const link = document.createElement('a');
            link.href = editedImageUrl;
            link.download = `edited_${originalImageFile?.name || 'image.png'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const ImageUploadArea = () => (
        <div 
            className="w-full h-64 border-2 border-dashed border-slate-500 rounded-lg flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-purple-400 hover:bg-white/5 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            <p className="mt-2 font-semibold">Click or drag & drop to upload</p>
            <p className="text-sm">PNG, JPG, or WEBP</p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>
    );

    const ResultArea = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <SpinnerIcon className="w-12 h-12 text-purple-400" />
                    <p className="mt-4 text-slate-300">Editing your image...</p>
                </div>
            );
        }
        if (editedImageUrl) {
             return <img src={editedImageUrl} alt="Edited result" className="w-full h-full object-contain rounded-lg" />;
        }
        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-red-400">
                    <WarningIcon className="w-12 h-12" />
                    <p className="mt-4 font-semibold">An Error Occurred</p>
                    <p className="text-sm">{error}</p>
                </div>
            );
        }
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <p className="mt-4">Your edited image will appear here</p>
            </div>
        );
    };


    return (
        <div className="flex-grow flex flex-col min-h-0 glassmorphism rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-y-auto custom-scrollbar-dark">
                {/* Input Panel */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-bold text-slate-100">1. Upload Your Image</h2>
                    {originalImageUrl ? (
                        <div className="relative group">
                            <img src={originalImageUrl} alt="Original input" className="w-full rounded-lg" />
                            <button onClick={handleStartOver} className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                        </div>
                    ) : (
                        <ImageUploadArea />
                    )}
                    
                    <h2 className="text-xl font-bold text-slate-100 mt-2">2. Describe Your Edit</h2>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., Add a futuristic cityscape in the background"
                        className="w-full h-24 p-3 glass-input rounded-md shadow-sm resize-none"
                        disabled={!originalImageFile}
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={!originalImageFile || !prompt.trim() || isLoading}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <SpinnerIcon className="w-5 h-5" /> : <SparkleIcon className="w-5 h-5" />}
                        <span>{isLoading ? 'Generating...' : 'Generate Image'}</span>
                    </button>
                </div>

                {/* Output Panel */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-bold text-slate-100">Result</h2>
                    <div className="flex-grow w-full min-h-[300px] bg-black/20 rounded-lg p-2 flex items-center justify-center">
                        <ResultArea />
                    </div>
                    {editedImageUrl && !isLoading && (
                        <div className="grid grid-cols-2 gap-4 animate-fade-in">
                             <button
                                onClick={handleStartOver}
                                className="w-full px-6 py-3 bg-white/10 text-slate-100 font-semibold rounded-lg shadow-sm hover:bg-white/20 transition-colors"
                            >
                                Start Over
                            </button>
                             <button
                                onClick={handleDownload}
                                className="w-full px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors"
                            >
                                Download
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageEditorPage;
