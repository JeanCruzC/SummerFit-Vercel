import { createClient } from '../supabase/client';
import type { Exercise, UserEquipment } from '@/types';

// ============================================
// Types
// ============================================

export type RoutineGoal = 'hypertrophy' | 'strength' | 'endurance';
export type RoutineLevel = 'beginner' | 'intermediate' | 'advanced';
export type RoutineSplit = 'push_pull_legs' | 'upper_lower' | 'full_body';

export interface RoutineRequest {
    goal: RoutineGoal;
    level: RoutineLevel;
    split: RoutineSplit;
    equipment: UserEquipment[]; // Uses updated type from project
}

export interface GeneratedRoutine {
    name: string;
    description: string;
    days: GeneratedDay[];
}

export interface GeneratedDay {
    dayName: string;
    focus: string; // "Push - Chest/Delts/Triceps"
    exercises: GeneratedExercise[];
}

export interface GeneratedExercise {
    exercise: Exercise;
    sets: number;
    reps: string;
    rest: string;
    reason: string; // "Selected for high hypertrophy score (5/5)"
    note?: string; // "Focus on slow eccentric"
}

// ============================================
// Scientific Constants (The "Encyclopedia" Logic)
// ============================================

const TARGET_Volume = {
    hypertrophy: { sets: 3, reps: "8-12", rest: "90s" },
    strength: { sets: 4, reps: "3-6", rest: "3min" },
    endurance: { sets: 2, reps: "15-20", rest: "60s" }
};

// Biomechanical Slots for PPL
// 1. Slot Name
// 2. Required Pattern
// 3. Selection Weight (Hypertrophy vs Stability)
const PPL_TEMPLATE = {
    push: [
        { id: 'compound_press_horiz', pattern: 'horizontal_press', role: 'Main Builder' },
        { id: 'compound_press_vert', pattern: 'vertical_press', role: 'Shoulder Builder' },
        { id: 'isolation_chest', pattern: 'chest_fly', role: 'Chest Stretch' },
        { id: 'isolation_triceps', pattern: 'triceps_extension', role: 'Triceps Mass' },
        { id: 'isolation_delts', pattern: 'shoulder_raise', role: 'Side Delts' }
    ],
    pull: [
        { id: 'compound_pull_vert', pattern: 'vertical_pull', role: 'Lats Width' },
        { id: 'compound_pull_horiz', pattern: 'horizontal_pull', role: 'Back Thickness' },
        { id: 'prehab_delts', pattern: 'scapular_retraction', role: 'Shoulder Health' },
        { id: 'isolation_biceps', pattern: 'elbow_flexion_curl', role: 'Biceps Peak' },
        { id: 'isolation_biceps_2', pattern: 'elbow_flexion_curl', role: 'Biceps Stretch/Volume' }
    ],
    legs: [
        { id: 'compound_knee', pattern: 'squat', role: 'Quads/Glutes Builder' },
        { id: 'compound_hinge', pattern: 'hip_hinge', role: 'Hamstrings/Back' },
        { id: 'unilateral_leg', pattern: 'lunge_step', role: 'Stability/Glutes' },
        { id: 'isolation_hamstring', pattern: 'knee_flexion_isolation', role: 'Hamstring Isolation' },
        { id: 'isolation_calves', pattern: 'calf_raise', role: 'Calves' }
    ]
};

// ============================================
// The Generator Class
// ============================================

export class RoutineGenerator {
    private supabase = createClient();

    /**
     * Main entry point to generate a routine
     */
    async generate(request: RoutineRequest): Promise<GeneratedRoutine> {
        console.log("⚡ Generating routine for:", request);

        // 1. Fetch Candidate Exercises
        // We need a pool of exercises that match the user's equipment
        // We do NOT filter by level yet (we use level for scoring/penalties)
        const candidates = await this.fetchCandidates(request.equipment);

        if (candidates.length < 10) {
            throw new Error("Insufficient exercises found for your equipment. Try adding more equipment/Bodyweight.");
        }

        // 2. Select Exercises based on Split
        let days: GeneratedDay[] = [];

        if (request.split === 'push_pull_legs') {
            days = [
                this.buildDay('Push (Empuje)', 'Pectoral, Hombro, Tríceps', PPL_TEMPLATE.push, candidates, request),
                this.buildDay('Pull (Tracción)', 'Espalda, Bíceps, Deltoides Post.', PPL_TEMPLATE.pull, candidates, request),
                this.buildDay('Legs (Pierna)', 'Cuádriceps, Femoral, Glúteo', PPL_TEMPLATE.legs, candidates, request)
            ];
        } else {
            // Fallback to PPL for now as MVP
            days = [
                this.buildDay('Push (Empuje)', 'Pectoral, Hombro, Tríceps', PPL_TEMPLATE.push, candidates, request),
                this.buildDay('Pull (Tracción)', 'Espalda, Bíceps, Deltoides Post.', PPL_TEMPLATE.pull, candidates, request),
                this.buildDay('Legs (Pierna)', 'Cuádriceps, Femoral, Glúteo', PPL_TEMPLATE.legs, candidates, request)
            ];
        }

        return {
            name: `${this.capitalize(request.goal)} ${this.capitalize(request.split)} Routine`,
            description: `A science-based routine optimized for ${request.goal} using your available equipment. Focuses on biomechanical balance.`,
            days
        };
    }

    // ----------------------------------------------------------------
    // Internal Logic
    // ----------------------------------------------------------------

    private async fetchCandidates(equipment: UserEquipment[]): Promise<Exercise[]> {
        const availableEq = equipment.map(e => e.equipment_type);
        // Add defaults
        availableEq.push('Peso corporal', 'None', 'Ninguno', 'Bodyweight');

        // Fetch ALL exercises that match equipment
        // We need movement_pattern to be populated!
        const { data, error } = await this.supabase
            .from('exercises')
            .select('*')
            .containedBy('equipment_required', availableEq);

        if (error) throw error;
        return data || [];
    }

    private buildDay(dayName: string, focus: string, templateSlots: any[], candidates: Exercise[], request: RoutineRequest): GeneratedDay {
        const dayExercises: GeneratedExercise[] = [];
        const usedIds = new Set<number>();

        for (const slot of templateSlots) {
            // 1. Filter candidates for this slot (Pattern match)
            const slotCandidates = candidates.filter(ex =>
                ex.movement_pattern === slot.pattern && !usedIds.has(ex.id)
            );

            // 2. Score them
            const scoredCandidates = slotCandidates.map(ex => ({
                exercise: ex,
                score: this.calculateScore(ex, request)
            }));

            // 3. Sort by Score Descending
            scoredCandidates.sort((a, b) => b.score - a.score);

            // 4. Pick the winner
            const winner = scoredCandidates[0];

            if (winner) {
                usedIds.add(winner.exercise.id);
                // Determine Volume based on Goal
                const volume = TARGET_Volume[request.goal];

                dayExercises.push({
                    exercise: winner.exercise,
                    sets: volume.sets,
                    reps: winner.exercise.reps_sugeridas_por_objetivo?.[request.goal] || volume.reps, // Use specific if available
                    rest: volume.rest,
                    reason: `Selected for ${slot.role} (Score: ${winner.score.toFixed(1)}/5)`
                });
            } else {
                console.warn(`No candidate found for slot: ${slot.pattern}`);
            }
        }

        return {
            dayName,
            focus,
            exercises: dayExercises
        };
    }

    /**
     * The "Secret Sauce" Formula
     */
    private calculateScore(ex: Exercise, req: RoutineRequest): number {
        let score = 0;

        // Base: Hypertrophy Score (from Science JSON)
        // If missing, assume average (2.5)
        const hScore = ex.score_hypertrophy || 2.5;

        // Weights change based on goal
        if (req.goal === 'hypertrophy') {
            score += hScore * 1.0; // High weight on hypertrophy potential
        } else if (req.goal === 'strength') {
            score += (ex.score_strength || 2.5) * 1.0;
        } else {
            score += hScore * 0.5;
        }

        // Stability Bonus (Stable exercises are better for raw output)
        if (ex.score_stability) {
            score += (ex.score_stability - 3) * 0.2; // Bonus if > 3, penalty if < 3
        }

        // Level Penalties
        // If user is beginner, heavily penalize high difficulty/risk
        if (req.level === 'beginner') {
            if (ex.level === 'Avanzado') score -= 2; // Hard penalty
            if ((ex.score_difficulty || 0) > 3) score -= 1;
            if ((ex.score_risk || 0) > 3) score -= 1;
        }

        // Diversity Bonus/Malus?? (Not needed per exercise, handled by slots)

        return score;
    }

    private capitalize(s: string) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
}
