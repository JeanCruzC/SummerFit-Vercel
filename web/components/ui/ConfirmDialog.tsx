"use client";

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    isLoading?: boolean;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    isDestructive = false,
    isLoading = false
}: ConfirmDialogProps) {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-surface-light dark:bg-surface-dark p-6 text-left align-middle shadow-xl transition-all border border-border-light dark:border-border-dark">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full shrink-0 ${isDestructive ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-600'}`}>
                                        {isDestructive ? <Trash2 className="size-6" /> : <AlertTriangle className="size-6" />}
                                    </div>
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-bold leading-6 text-text-main dark:text-white"
                                    >
                                        {title}
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="ml-auto text-text-secondary dark:text-gray-400 hover:text-text-main dark:hover:text-white transition-colors"
                                    >
                                        <X className="size-5" />
                                    </button>
                                </div>

                                <div className="mt-3">
                                    <p className="text-sm text-text-secondary dark:text-gray-300">
                                        {description}
                                    </p>
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-lg px-4 py-2 text-sm font-medium text-text-secondary dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                                        onClick={onClose}
                                        disabled={isLoading}
                                    >
                                        {cancelText}
                                    </button>
                                    <button
                                        type="button"
                                        className={`inline-flex justify-center rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${isDestructive
                                                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 shadow-glow-sm'
                                                : 'bg-primary hover:bg-primary-dark focus:ring-primary'
                                            } disabled:opacity-70 disabled:cursor-not-allowed`}
                                        onClick={onConfirm}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Procesando...</span>
                                            </div>
                                        ) : (
                                            confirmText
                                        )}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
