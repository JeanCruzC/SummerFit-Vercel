"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

interface SuccessOverlayProps {
    isVisible: boolean;
    message?: string;
    onComplete?: () => void;
}

export default function SuccessOverlay({ isVisible, message = "¡Guardado con éxito!", onComplete }: SuccessOverlayProps) {
    return (
        <AnimatePresence onExitComplete={onComplete}>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center max-w-sm w-full mx-4"
                    >
                        <div className="relative mb-6">
                            {/* Animated Background Blob */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 10 }}
                                className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
                            >
                                <motion.div
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ delay: 0.4, duration: 0.5 }}
                                >
                                    <Check className="h-10 w-10 text-green-600 dark:text-green-400 stroke-[3px]" />
                                </motion.div>
                            </motion.div>
                        </div>

                        <motion.h3
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-xl font-bold text-gray-900 dark:text-white text-center"
                        >
                            {message}
                        </motion.h3>

                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-gray-500 mt-2 text-center text-sm"
                        >
                            Tus cambios han sido aplicados.
                        </motion.p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
