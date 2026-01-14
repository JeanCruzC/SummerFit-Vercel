"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { X, Calendar, Dumbbell, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface WorkoutHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
}

export default function WorkoutHistoryModal({ isOpen, onClose, userId, userName }: WorkoutHistoryModalProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && userId) {
            fetchHistory();
        }
    }, [isOpen, userId]);

    const fetchHistory = async () => {
        setLoading(true);
        const supabase = createClient();

        // Fetch last 10 logs with their related workout details
        // Note: exercise_logs usually has a log_date, duration, and maybe a routine_id or workout_name
        // Adjust query based on actual schema. Assuming 'exercise_logs' has 'workout_name', 'duration_minutes', 'log_date'

        const { data, error } = await supabase
            .from("exercise_logs")
            .select("*")
            .eq("user_id", userId)
            .order("log_date", { ascending: false })
            .limit(10);

        if (data) {
            setHistory(data);
        }
        setLoading(false);
    };

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
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
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
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all border border-gray-100 dark:border-gray-700">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-bold leading-6 text-gray-900 dark:text-white flex justify-between items-center mb-4"
                                >
                                    <span>Historial de {userName}</span>
                                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </Dialog.Title>

                                <div className="mt-2 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                                    {loading ? (
                                        <div className="text-center py-8 text-gray-400">Cargando historial...</div>
                                    ) : history.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 flex flex-col items-center gap-2">
                                            <Dumbbell className="w-8 h-8 opacity-20" />
                                            <p>No hay entrenamientos recientes</p>
                                        </div>
                                    ) : (
                                        history.map((log) => (
                                            <div key={log.id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl flex items-center gap-3">
                                                <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                                                    <Dumbbell className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                                        {log.workout_name || "Entrenamiento"}
                                                    </h4>
                                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(log.log_date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                        </span>
                                                        {log.duration_minutes && (
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {log.duration_minutes} min
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-xl border border-transparent bg-purple-100 px-4 py-2 text-sm font-medium text-purple-900 hover:bg-purple-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        Cerrar
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
