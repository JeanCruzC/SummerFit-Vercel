"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Camera, Upload, Loader2, User } from "lucide-react";
import { Button } from "./index";
import Image from "next/image";

interface AvatarUploadProps {
    userId: string;
    url?: string | null;
    onUpload: (url: string) => void;
}

export default function AvatarUpload({ userId, url, onUpload }: AvatarUploadProps) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error("Selecciona una imagen.");
            }

            const file = event.target.files[0];
            const fileExt = file.name.split(".").pop();
            const fileName = `${userId}/${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const supabase = createClient();

            // 1. Upload
            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, file, {
                    upsert: true // Overwrite logic in simple implementation
                });

            if (uploadError) {
                throw uploadError;
            }

            // 2. Get Public URL
            const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

            if (data) {
                onUpload(data.publicUrl);
            }

        } catch (error) {
            console.error("Error uploading avatar:", error);
            alert("Error al subir la imagen");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {/* Avatar Display */}
                <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative">
                    {url ? (
                        <Image
                            src={url}
                            alt="Avatar"
                            width={128}
                            height={128}
                            className="object-cover w-full h-full"
                        />
                    ) : (
                        <User className="h-16 w-16 text-gray-400" />
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="h-8 w-8 text-white" />
                    </div>

                    {/* Loading State */}
                    {uploading && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center z-10">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                        </div>
                    )}
                </div>

                {/* Edit Badge */}
                <div className="absolute bottom-1 right-1 bg-purple-600 text-white p-2 rounded-full shadow-lg border-2 border-white dark:border-gray-900 group-hover:scale-110 transition-transform">
                    <Upload className="h-4 w-4" />
                </div>
            </div>

            <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleUpload}
                ref={fileInputRef}
                disabled={uploading}
            />

            <p className="text-xs text-gray-500">
                Toca para cambiar foto (Max 2MB)
            </p>
        </div>
    );
}
