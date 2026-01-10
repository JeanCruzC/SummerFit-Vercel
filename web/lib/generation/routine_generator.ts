import { createClient } from '../supabase/client';
import type { Exercise, UserEquipment } from '@/types';
import { SmartCoach } from '../intelligence/smart_coach';
import { FrequencyEngine, SplitType } from '../intelligence/frequency_engine';
import { IntensityManager } from '../intelligence/intensity_manager';

// ============================================
// Types
// ============================================

export type RoutineGoal = 'hypertrophy' | 'strength' | 'recomposition' | 'fat_loss' | 'maintenance';
export type RoutineLevel = 'beginner' | 'intermediate' | 'advanced';

export interface RoutineRequest {
    goal: RoutineGoal;
    level: RoutineLevel;
    daysAvailable: number; // New Input
    timePerSession?: number; // Minutes
    equipment: UserEquipment[];
    profile?: { weight_kg: number; height_cm: number; target_weight_kg: number; };
}

export interface GeneratedRoutine {
    name: string;
    description: string;
    split: SplitType;
    days: GeneratedDay[];
    weeklyVolume: number; // Sets per week suggestion
}

export interface GeneratedDay {
    dayName: string;
    focus: string;
    exercises: GeneratedExercise[];
    cardio_session?: CardioSession;
}

export interface CardioSession {
    type: 'low_impact' | 'moderate' | 'hiit' | 'optional';
    duration: number; // minutes
    frequency_per_week: number;
    exercises: GeneratedExercise[];
    timing: 'after_weights' | 'separate_session' | 'morning';
}

export interface GeneratedExercise {
    exercise: Exercise;
    sets: number;
    reps: string; // Range "8-12"
    rest: string; // "90s"
    tempo: string; // "2-0-1-0"
    rir: string; // "1-2 RIR"
    reason: string;
    note?: string;
}

// ============================================
// Biomechanical Templates (The Intelligence Maps)
// ============================================

const SPLIT_TEMPLATES: Record<SplitType, any> = {
    'full_body': [
        {
            name: "Full Body A",
            focus: "Global Hypertrophy",
            slots: [
                { id: 'compound_knee', pattern: 'squat', role: 'compound_heavy' },
                { id: 'compound_press_horiz', pattern: 'horizontal_press', role: 'compound_medium' },
                { id: 'compound_pull_vert', pattern: 'vertical_pull', role: 'compound_medium' },
                { id: 'compound_hinge_light', pattern: 'hip_hinge', role: 'compound_medium' },
                { id: 'isolation_delts', pattern: 'shoulder_raise', role: 'isolation' }
            ]
        },
        {
            name: "Full Body B",
            focus: "Strength & Power",
            slots: [
                { id: 'compound_hinge', pattern: 'hip_hinge', role: 'compound_heavy' },
                { id: 'compound_press_vert', pattern: 'vertical_press', role: 'compound_heavy' },
                { id: 'unilateral_leg', pattern: 'lunge_step', role: 'compound_medium' },
                { id: 'compound_pull_horiz', pattern: 'horizontal_pull', role: 'compound_medium' },
                { id: 'isolation_arms', pattern: 'elbow_flexion_curl', role: 'isolation' }
            ]
        },
        // In a real app, we would have C, D etc to cycle through 3 days
        {
            name: "Full Body C",
            focus: "Metabolic / Accessory",
            slots: [
                { id: 'compound_knee_2', pattern: 'leg_press_squat', role: 'compound_medium' },
                { id: 'isolation_chest', pattern: 'chest_fly', role: 'isolation' },
                { id: 'isolation_back', pattern: 'scapular_retraction', role: 'isolation' },
                { id: 'isolation_triceps', pattern: 'triceps_extension', role: 'isolation' },
                { id: 'isolation_abs', pattern: 'core_flexion', role: 'isolation' }
            ]
        }
    ],
    'upper_lower': [
        {
            name: "Upper A (Strength)",
            focus: "Torso Power",
            slots: [
                { id: 'compound_press_horiz', pattern: 'horizontal_press', role: 'compound_heavy' },
                { id: 'compound_pull_horiz', pattern: 'horizontal_pull', role: 'compound_heavy' },
                { id: 'compound_press_vert', pattern: 'vertical_press', role: 'compound_medium' },
                { id: 'compound_pull_vert', pattern: 'vertical_pull', role: 'compound_medium' },
                { id: 'isolation_arms', pattern: 'elbow_flexion_curl', role: 'isolation' }
            ]
        },
        {
            name: "Lower A (Squat Focus)",
            focus: "Leg Power",
            slots: [
                { id: 'compound_knee', pattern: 'squat', role: 'compound_heavy' },
                { id: 'compound_hinge_light', pattern: 'hip_hinge', role: 'compound_medium' },
                { id: 'unilateral_leg', pattern: 'lunge_step', role: 'compound_medium' },
                { id: 'isolation_calves', pattern: 'calf_raise', role: 'isolation' },
                { id: 'isolation_abs', pattern: 'core_flexion', role: 'isolation' }
            ]
        },
        {
            name: "Upper B (Hypertrophy)",
            focus: "Torso Volume",
            slots: [
                { id: 'compound_press_vert', pattern: 'vertical_press', role: 'compound_medium' },
                { id: 'compound_pull_vert', pattern: 'vertical_pull', role: 'compound_medium' },
                { id: 'compound_press_inc', pattern: 'horizontal_press', role: 'compound_medium' }, // Incline ideal
                { id: 'isolation_delts', pattern: 'shoulder_raise', role: 'isolation' },
                { id: 'isolation_triceps', pattern: 'triceps_extension', role: 'isolation' }
            ]
        },
        {
            name: "Lower B (Hinge Focus)",
            focus: "Posterior Chain",
            slots: [
                { id: 'compound_hinge', pattern: 'hip_hinge', role: 'compound_heavy' },
                { id: 'compound_knee_2', pattern: 'leg_press_squat', role: 'compound_medium' },
                { id: 'isolation_hamstring', pattern: 'knee_flexion_isolation', role: 'isolation' },
                { id: 'isolation_calves', pattern: 'calf_raise', role: 'isolation' }
            ]
        }
    ],
    'ppl': [
        {
            name: "Push A", focus: "Chest/Shoulders/Tri",
            slots: [
                { id: 'press_horiz', pattern: 'horizontal_press', role: 'compound_heavy' },
                { id: 'press_vert', pattern: 'vertical_press', role: 'compound_medium' },
                { id: 'iso_chest', pattern: 'chest_fly', role: 'isolation' },
                { id: 'iso_tri', pattern: 'triceps_extension', role: 'isolation' },
                { id: 'iso_delt', pattern: 'shoulder_raise', role: 'isolation' }
            ]
        },
        {
            name: "Pull A", focus: "Back/Bi/Rear Delt",
            slots: [
                { id: 'pull_vert', pattern: 'vertical_pull', role: 'compound_heavy' },
                { id: 'pull_horiz', pattern: 'horizontal_pull', role: 'compound_medium' },
                { id: 'prehab', pattern: 'scapular_retraction', role: 'isolation' },
                { id: 'iso_bi', pattern: 'elbow_flexion_curl', role: 'isolation' },
                { id: 'iso_bi2', pattern: 'elbow_flexion_curl', role: 'isolation' }
            ]
        },
        {
            name: "Legs A", focus: "Quads/Hams/Glutes",
            slots: [
                { id: 'squat', pattern: 'squat', role: 'compound_heavy' },
                { id: 'hinge', pattern: 'hip_hinge', role: 'compound_medium' },
                { id: 'lunge', pattern: 'lunge_step', role: 'compound_medium' },
                { id: 'curl', pattern: 'knee_flexion_isolation', role: 'isolation' },
                { id: 'calf', pattern: 'calf_raise', role: 'isolation' }
            ]
        },
        { name: "Push B", slots: [] }, // Simplified for MVP
        { name: "Pull B", slots: [] },
        { name: "Legs B", slots: [] }
    ],
    'arnold': [
        {
            name: "Chest & Back",
            focus: "Antagonist Super-Pump",
            slots: [
                { id: 'press_horiz', pattern: 'horizontal_press', role: 'compound_heavy' },
                { id: 'pull_horiz', pattern: 'horizontal_pull', role: 'compound_heavy' },
                { id: 'press_inc', pattern: 'horizontal_press', role: 'compound_medium' },
                { id: 'pull_vert', pattern: 'vertical_pull', role: 'compound_medium' },
                { id: 'iso_core', pattern: 'core_flexion', role: 'isolation' }
            ]
        },
        {
            name: "Shoulders & Arms",
            focus: "Delts & Gun Show",
            slots: [
                { id: 'press_vert', pattern: 'vertical_press', role: 'compound_heavy' },
                { id: 'iso_delt', pattern: 'shoulder_raise', role: 'isolation' },
                { id: 'iso_bi', pattern: 'elbow_flexion_curl', role: 'isolation' },
                { id: 'iso_tri', pattern: 'triceps_extension', role: 'isolation' },
                { id: 'iso_bi2', pattern: 'elbow_flexion_curl', role: 'isolation' }
            ]
        },
        {
            name: "Legs",
            focus: "Lower Body Destruction",
            slots: [
                { id: 'squat', pattern: 'squat', role: 'compound_heavy' },
                { id: 'hinge', pattern: 'hip_hinge', role: 'compound_medium' },
                { id: 'lunge', pattern: 'lunge_step', role: 'compound_medium' },
                { id: 'core', pattern: 'core_stability', role: 'isolation' }
            ]
        }
    ],
    'bro_split': [
        {
            name: "Chest Day",
            focus: "Pectoral Annihilation",
            slots: [
                { id: 'press_flat', pattern: 'horizontal_press', role: 'compound_heavy' },
                { id: 'press_inc', pattern: 'horizontal_press', role: 'compound_medium' },
                { id: 'press_dec', pattern: 'horizontal_press', role: 'compound_medium' },
                { id: 'iso_tri', pattern: 'triceps_extension', role: 'isolation' }
            ]
        },
        {
            name: "Back Day",
            focus: "Lat Spread & Thickness",
            slots: [
                { id: 'hinge', pattern: 'hip_hinge', role: 'compound_heavy' },
                { id: 'pull_vert', pattern: 'vertical_pull', role: 'compound_heavy' },
                { id: 'pull_horiz', pattern: 'horizontal_pull', role: 'compound_medium' },
                { id: 'pull_horiz2', pattern: 'horizontal_pull', role: 'compound_medium' }
            ]
        },
        {
            name: "Shoulders Day",
            focus: "3D Delts",
            slots: [
                { id: 'press_vert', pattern: 'vertical_press', role: 'compound_heavy' },
                { id: 'iso_lateral', pattern: 'shoulder_raise', role: 'isolation' },
                { id: 'iso_lateral2', pattern: 'shoulder_raise', role: 'isolation' },
                { id: 'iso_core', pattern: 'core_stability', role: 'isolation' }
            ]
        },
        {
            name: "Legs Day",
            focus: "Quad/Ham/Glute Overload",
            slots: [
                { id: 'squat', pattern: 'squat', role: 'compound_heavy' },
                { id: 'hinge', pattern: 'hip_hinge', role: 'compound_heavy' },
                { id: 'lunge', pattern: 'lunge_step', role: 'compound_medium' },
                { id: 'core', pattern: 'core_flexion', role: 'isolation' }
            ]
        },
        {
            name: "Arms Day",
            focus: "Biceps & Triceps Pump",
            slots: [
                { id: 'iso_bi', pattern: 'elbow_flexion_curl', role: 'isolation' },
                { id: 'iso_bi2', pattern: 'elbow_flexion_curl', role: 'isolation' },
                { id: 'iso_tri', pattern: 'triceps_extension', role: 'isolation' },
                { id: 'iso_tri2', pattern: 'triceps_extension', role: 'isolation' }
            ]
        }
    ], // To be implemented
    'ulppl': [
        {
            name: "Upper A (Strength)",
            focus: "Heavy Compounds",
            slots: [
                { id: 'press_horiz', pattern: 'horizontal_press', role: 'compound_heavy' },
                { id: 'pull_horiz', pattern: 'horizontal_pull', role: 'compound_heavy' },
                { id: 'press_vert', pattern: 'vertical_press', role: 'compound_medium' },
                { id: 'pull_vert', pattern: 'vertical_pull', role: 'compound_medium' }
            ]
        },
        {
            name: "Lower A (Squat Dominant)",
            focus: "Quad Focus",
            slots: [
                { id: 'squat', pattern: 'squat', role: 'compound_heavy' },
                { id: 'hinge', pattern: 'hip_hinge', role: 'compound_medium' },
                { id: 'lunge', pattern: 'lunge_step', role: 'compound_medium' },
                { id: 'core', pattern: 'core_stability', role: 'isolation' }
            ]
        },
        {
            name: "Push",
            focus: "Chest/Shoulders/Tri",
            slots: [
                { id: 'press_horiz', pattern: 'horizontal_press', role: 'compound_medium' },
                { id: 'press_vert', pattern: 'vertical_press', role: 'compound_medium' },
                { id: 'iso_delt', pattern: 'shoulder_raise', role: 'isolation' },
                { id: 'iso_tri', pattern: 'triceps_extension', role: 'isolation' }
            ]
        },
        {
            name: "Pull",
            focus: "Back/Bi/Rear Delt",
            slots: [
                { id: 'pull_vert', pattern: 'vertical_pull', role: 'compound_medium' },
                { id: 'pull_horiz', pattern: 'horizontal_pull', role: 'compound_medium' },
                { id: 'iso_bi', pattern: 'elbow_flexion_curl', role: 'isolation' },
                { id: 'iso_bi2', pattern: 'elbow_flexion_curl', role: 'isolation' }
            ]
        },
        {
            name: "Legs B (Hinge Dominant)",
            focus: "Posterior Chain",
            slots: [
                { id: 'hinge', pattern: 'hip_hinge', role: 'compound_heavy' },
                { id: 'squat', pattern: 'squat', role: 'compound_medium' },
                { id: 'lunge', pattern: 'lunge_step', role: 'compound_medium' },
                { id: 'core', pattern: 'core_flexion', role: 'isolation' }
            ]
        }
    ]
};

// ============================================
// The Generator Class
// ============================================

export class RoutineGenerator {
    private supabase = createClient();

    async generate(request: RoutineRequest): Promise<GeneratedRoutine> {
        const sanitizedRequest = JSON.stringify({ ...request, equipment: `[${request.equipment.length} items]` });
        console.log("🧠 Smart Coach Generating for:", sanitizedRequest);

        // 1. DIALOG WITH THE BRAIN
        // Get the optimal split and volume from Smart Coach
        const diagnosis = SmartCoach.generateProfile(
            request.level,
            request.goal,
            request.daysAvailable
        );

        const recommendedSplit = diagnosis.recommendations.split.split;
        const volumeTargets = diagnosis.recommendations.weekly_sets;

        console.log("💡 Brain Recommendation:", JSON.stringify({ split: recommendedSplit, volume: volumeTargets.optimal_sets }));

        // 2. FETCH CANDIDATES
        const candidates = await this.fetchCandidates(request.equipment);
        if (candidates.length < 10) throw new Error(`Insufficient exercise options (${candidates.length} found). Add more equipment types.`);

        // 2.5 GENERATE CARDIO SESSION (if applicable)
        let cardioSession: CardioSession | undefined;
        if (request.profile) {
            const { ProfileAnalyzer } = await import('../intelligence/profile_analyzer');
            const equipmentTypes = request.equipment.map(e => e.equipment_type);
            const analysis = ProfileAnalyzer.analyze(
                request.profile.weight_kg,
                request.profile.height_cm,
                request.profile.target_weight_kg,
                equipmentTypes
            );
            cardioSession = await this.generateCardioSession(
                analysis.recommended_cardio,
                request.equipment,
                candidates
            );
        }

        // 3. SELECT TEMPLATE
        // Fallback to PPL if template not fully defined
        let template = SPLIT_TEMPLATES[recommendedSplit];
        if (!template || template.length === 0) {
            console.warn(`Template for ${recommendedSplit} not ready, falling back to PPL`);
            template = SPLIT_TEMPLATES['ppl'];
        }

        // 4. BUILD DAYS
        // We only generate unique days from the template to fit the daysAvailable
        // e.g. if 3 days available and using Full Body template (which has A, B, C), we use A, B, C.
        const generatedDays: GeneratedDay[] = [];

        // Loop through the template days available
        // Note: Logic here is simplified. In a real app we map "Monday -> Upper A", etc.
        // For now we just return the days defined in the template up to a limit.
        const daysToGenerate = Math.min(request.daysAvailable, template.length);

        for (let i = 0; i < daysToGenerate; i++) {
            const templateDay = template[i];

            // Should be empty day? (e.g. for PPL placeholder)
            if (!templateDay.slots || templateDay.slots.length === 0) {
                // Clone day 0 if needed (A/B cycle logic)
                const cloneIndex = i % 3;
                if (cloneIndex < generatedDays.length) {
                    const clone = generatedDays[cloneIndex];
                    generatedDays.push({ ...clone, dayName: templateDay.name || `Day ${i + 1}` });
                }
                continue;
            }

            const builtDay = this.buildDay(templateDay.name, templateDay.focus, templateDay.slots, candidates, request, volumeTargets.optimal_sets);

            // Attach cardio to specific days based on frequency
            if (cardioSession && cardioSession.timing === 'after_weights') {
                // Add cardio after weights on strength training days (alternate days)
                if (i % 2 === 0 && i < cardioSession.frequency_per_week) {
                    builtDay.cardio_session = cardioSession;
                }
            }

            generatedDays.push(builtDay);
        }

        // Add separate cardio days if needed (for low_impact/separate_session)
        if (cardioSession && cardioSession.timing === 'separate_session') {
            const cardioOnlyDays = Math.min(cardioSession.frequency_per_week, 7 - generatedDays.length);
            for (let i = 0; i < cardioOnlyDays; i++) {
                generatedDays.push({
                    dayName: `Cardio Day ${i + 1}`,
                    focus: `${cardioSession.type.toUpperCase()} Cardio`,
                    exercises: [],
                    cardio_session: cardioSession
                });
            }
        }

        return {
            name: `${this.capitalize(request.goal)} ${this.capitalize(recommendedSplit)} Protocol`,
            description: diagnosis.recommendations.split.description,
            split: recommendedSplit,
            days: generatedDays,
            weeklyVolume: volumeTargets.optimal_sets
        };
    }

    // ----------------------------------------------------------------
    // Internal Logic
    // ----------------------------------------------------------------

    private async fetchCandidates(equipment: UserEquipment[]): Promise<Exercise[]> {
        const availableEq = equipment.map(e => e.equipment_type);
        availableEq.push('Peso corporal', 'None', 'Ninguno', 'Bodyweight');

        const { data, error } = await this.supabase
            .from('exercises')
            .select('*, exercise_media(*)')
            .containedBy('equipment_required', availableEq);

        if (error) throw error;
        return data || [];
    }

    private async generateCardioSession(
        cardioRecommendation: { type: string; frequency: number; duration: number; options: string[]; },
        equipment: UserEquipment[],
        allExercises: Exercise[]
    ): Promise<CardioSession | undefined> {
        if (!cardioRecommendation || cardioRecommendation.frequency === 0) return undefined;

        const availableEq = equipment.map(e => e.equipment_type);
        const hasCinta = availableEq.some(e => e.toLowerCase().includes('cinta') || e.toLowerCase().includes('treadmill'));

        // Filter cardio exercises based on type
        const cardioType = cardioRecommendation.type;
        let targetPattern: string;

        if (cardioType === 'low_impact') {
            targetPattern = 'cardio_low_impact';
        } else if (cardioType === 'moderate' || cardioType === 'hiit') {
            targetPattern = 'cardio_hiit';
        } else {
            targetPattern = 'cardio_steady';
        }

        // Find matching cardio exercises
        const cardioExercises = allExercises.filter(ex =>
            ex.type === 'Cardio' &&
            ex.movement_pattern === targetPattern &&
            ex.equipment_required && (
                ex.equipment_required.includes('Peso corporal') ||
                (hasCinta && ex.equipment_required.some(req => req.toLowerCase().includes('cinta')))
            )
        );

        if (cardioExercises.length === 0) return undefined;

        // Select best cardio exercise
        const selectedCardio = cardioExercises.sort((a, b) => (b.ranking_score || 0) - (a.ranking_score || 0))[0];

        return {
            type: cardioType as 'low_impact' | 'moderate' | 'hiit' | 'optional',
            duration: cardioRecommendation.duration,
            frequency_per_week: cardioRecommendation.frequency,
            exercises: [{
                exercise: selectedCardio,
                sets: 1,
                reps: `${cardioRecommendation.duration}min`,
                rest: 'N/A',
                tempo: 'N/A',
                rir: 'RPE 7-8',
                reason: cardioRecommendation.options.join(', ')
            }],
            timing: cardioType === 'low_impact' ? 'separate_session' : 'after_weights'
        };
    }

    private buildDay(
        dayName: string,
        focus: string,
        slots: any[],
        candidates: Exercise[],
        request: RoutineRequest,
        optimalWeeklyVolume: number
    ): GeneratedDay {
        const dayExercises: GeneratedExercise[] = [];
        const usedIds = new Set<number>();

        // Sets per exercise logic:
        // If optimal weekly volume is 15 sets/muscle, and frequency is 2x,
        // we need ~7-8 sets per muscle per session.
        // If the day has 2 chest exercises, each gets ~3-4 sets.
        // Simplified: 3-4 sets per main lift, 2-3 per accessory.

        for (const slot of slots) {
            const winner = this.findBestExercise(slot, candidates, usedIds, request);

            if (winner) {
                usedIds.add(winner.exercise.id);

                // ASK THE INTENSITY MANAGER
                const params = SmartCoach.getExerciseRole(request.goal, slot.role);

                // Determine sets based on role
                const sets = slot.role.includes('heavy') ? 4 : 3;

                dayExercises.push({
                    exercise: winner.exercise,
                    sets: sets,
                    reps: `${params.reps[0]}-${params.reps[1]}`,
                    rest: `${params.rest[0]}-${params.rest[1]}s`,
                    tempo: params.tempo,
                    rir: `${params.rir[0]}-${params.rir[1]} RIR`,
                    reason: `Best fit for ${slot.role} (Score: ${winner.score.toFixed(1)})`,
                    note: params.note
                });
            }
        }

        return { dayName, focus, exercises: dayExercises };
    }

    private findBestExercise(slot: any, candidates: Exercise[], usedIds: Set<number>, request: RoutineRequest): { exercise: Exercise, score: number } | null {
        // Filter candidates by pattern and usage
        const slotCandidates = candidates.filter(ex =>
            ex.movement_pattern === slot.pattern && !usedIds.has(ex.id)
        );

        // Score candidates
        const scored = slotCandidates.map(ex => ({
            exercise: ex,
            score: this.calculateScore(ex, request)
        })).sort((a, b) => b.score - a.score);

        return scored.length > 0 ? scored[0] : null;
    }

    private calculateScore(ex: Exercise, req: RoutineRequest): number {
        let score = 0;

        if (req.goal === 'strength') {
            score = (ex.score_strength || 2.5) * 1.5;
        } else if (req.goal === 'fat_loss') {
            score = (ex.score_hypertrophy || 2.5) * 0.9;
        } else {
            score = ex.score_hypertrophy || 2.5;
        }

        if (ex.equipment_required?.includes('barbell')) score += 0.5;
        return score;
    }

    private capitalize(s: string) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
}


