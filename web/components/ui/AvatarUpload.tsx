import { useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Camera, Upload, Loader2, User, X, Check, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "./index";
import Image from "next/image";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/canvasUtils";

interface AvatarUploadProps {
    userId: string;
    url?: string | null;
    onUpload: (url: string) => void;
}

export default function AvatarUpload({ userId, url, onUpload }: AvatarUploadProps) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Crop State
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                setImageSrc(reader.result as string);
                setZoom(1);
                setCrop({ x: 0, y: 0 });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpload = async () => {
        try {
            if (!imageSrc || !croppedAreaPixels) return;
            setUploading(true);

            // Get cropped image
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (!croppedImageBlob) throw new Error("Error creating cropped image");

            const fileName = `${userId}/${Math.random()}.jpg`;
            const filePath = `${fileName}`;

            const supabase = createClient();

            // 1. Upload
            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, croppedImageBlob, {
                    upsert: true,
                    contentType: 'image/jpeg'
                });

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

            if (data) {
                onUpload(data.publicUrl);
                // Reset
                setImageSrc(null);
            }

        } catch (error) {
            console.error("Error uploading avatar:", error);
            alert("Error al subir la imagen");
        } finally {
            setUploading(false);
        }
    };

    const cancelCrop = () => {
        setImageSrc(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Main Display */}
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative">
                    {url ? (
                        <img
                            src={url}
                            alt="Avatar"
                            className="object-cover w-full h-full"
                        />
                    ) : (
                        <User className="h-16 w-16 text-gray-400" />
                    )}

                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="h-8 w-8 text-white" />
                    </div>

                    {uploading && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center z-10">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                        </div>
                    )}
                </div>

                <div className="absolute bottom-1 right-1 bg-purple-600 text-white p-2 rounded-full shadow-lg border-2 border-white dark:border-gray-900 group-hover:scale-110 transition-transform">
                    <Upload className="h-4 w-4" />
                </div>
            </div>

            <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
                ref={fileInputRef}
                disabled={uploading}
            />

            <p className="text-xs text-gray-500">
                Toca para cambiar foto (Max 2MB)
            </p>

            {/* Crop Modal */}
            {imageSrc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="font-semibold text-lg">Editar Foto</h3>
                            <button onClick={cancelCrop} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="relative h-80 w-full bg-gray-900">
                            {/* @ts-ignore */}
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                cropShape="round"
                                showGrid={false}
                            />
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="flex items-center gap-2">
                                <ZoomOut className="h-4 w-4 text-gray-500" />
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                />
                                <ZoomIn className="h-4 w-4 text-gray-500" />
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white"
                                    onClick={cancelCrop}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                                    onClick={handleUpload}
                                    disabled={uploading}
                                >
                                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Foto"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
