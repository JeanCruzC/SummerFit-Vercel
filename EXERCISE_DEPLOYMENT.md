# 🏋️ Exercise System - Deployment Instructions

## 📋 Prerequisites

- Supabase project configured
- Environment variables set in `web/.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_KEY` (for import script)

---

## 🚀 Step 1: Execute SQL Schema

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the entire content of `scripts/setup_exercises_schema.sql`
4. Paste and **Run** the SQL

This will create:
- ✅ `exercises` table (empty, ready for import)
- ✅ `user_equipment` table
- ✅ `workout_plans` table
- ✅ `workout_plan_exercises` table
- ✅ RLS policies
- ✅ Indexes
- ✅ Helper functions

---

## 📦 Step 2: Install Dependencies

```bash
cd web
npm install
```

This will install:
- `csv-parser` (for CSV parsing)
- `dotenv` (for environment variables)

---

## 📥 Step 3: Import Exercises Data

```bash
cd scripts
npx tsx import_exercises.ts
```

**Expected output:**
```
🏋️  Starting exercise import...

📊 Parsed 2919 exercises from CSV

Sample exercise:
{
  "slug": "partner-plank-band-row",
  "title": "Partner plank band row",
  ...
}

📦 Inserting batch 1/30 (100 exercises)...
✅ Batch 1 inserted successfully
...
📦 Inserting batch 30/30 (19 exercises)...
✅ Batch 30 inserted successfully

========================================
📊 IMPORT SUMMARY
========================================
✅ Successfully imported: 2919 exercises
========================================

✅ Verification: 2919 total exercises in database

🏋️  Analyzing equipment types...

Unique equipment types found:
  - Barra
  - Bandas
  - Banco
  - Cable
  - Kettlebell
  - Máquina
  - Mancuernas
  - Paralelas
  - Peso corporal
  ...

✅ Import completed!
```

**If you see errors:**
- Check that `SUPABASE_SERVICE_KEY` is set correctly
- Verify the SQL schema was executed
- Ensure `exercises_summerfit_es_final.csv` is in the root directory

---

## 🧪 Step 4: Test the System

### 4.1 Test Equipment Configuration

1. Navigate to `/dashboard/equipment`
2. Add some equipment (e.g., "Barra", "Mancuernas 10kg")
3. Click "Ver Ejercicios Disponibles"

### 4.2 Test Exercise Browsing

1. You should be redirected to `/dashboard/exercises`
2. You should see exercises filtered by your equipment
3. Try searching and filtering by body part/level/type

### 4.3 Verify Database

Run in Supabase SQL Editor:
```sql
-- Check total exercises
SELECT COUNT(*) FROM exercises;
-- Should return: 2919

-- Check equipment types
SELECT DISTINCT UNNEST(equipment_required) as equipment
FROM exercises
ORDER BY equipment;

-- Check body parts
SELECT body_part, COUNT(*) as count
FROM exercises
WHERE body_part IS NOT NULL
GROUP BY body_part
ORDER BY count DESC;
```

---

## 🎯 What's Working Now

### ✅ Completed Features:

1. **Equipment Configuration** (`/dashboard/equipment`)
   - Add/remove equipment
   - Specify quantities and weights
   - Visual icons for each type

2. **Exercise Browser** (`/dashboard/exercises`)
   - Auto-filtered by user equipment
   - Search by name
   - Filter by body part, level, type
   - Display MET values and ratings
   - Equipment badges

3. **Backend API** (`lib/supabase/exercises.ts`)
   - Equipment-based filtering
   - Search functionality
   - CRUD operations for equipment and plans
   - Calorie calculation functions

4. **Enhanced Projections** (`lib/calculations.ts`)
   - `calculateProjectionWithExercise()` function
   - Integrates workout calories into weight loss predictions

---

## 🔜 Next Steps (Not Yet Implemented)

### Workout Plan Builder
Create `/dashboard/workout-plan/page.tsx`:
- Drag & drop exercises to days of the week
- Set sets/reps/duration
- Calculate total weekly calories
- See updated progress projection

### Dashboard Integration
Update `/dashboard/page.tsx`:
- Show active workout plan
- Display calories burned this week
- Show improved weight loss projection with exercise

### Exercise Logging
Add to `daily_logs`:
- Track completed workouts
- Log actual calories burned
- Compare planned vs actual

---

## 📊 Database Stats

After import, you should have:
- **2,919 exercises** across all equipment types
- **~15 unique equipment types**
- **~50 body parts** (Abdomen, Pecho, Piernas, etc.)
- **3 levels** (Principiante, Intermedio, Avanzado)
- **3 types** (Fuerza, Cardio, Flexibilidad)

---

## 🐛 Troubleshooting

### "Cannot find module '@supabase/supabase-js'"
```bash
cd web
npm install @supabase/supabase-js
```

### "No exercises showing in /dashboard/exercises"
1. Check you added equipment in `/dashboard/equipment`
2. Verify exercises were imported: `SELECT COUNT(*) FROM exercises`
3. Check console for errors

### "RLS policy error"
Make sure you're logged in and the RLS policies were created correctly.

---

## ✅ Verification Checklist

- [ ] SQL schema executed successfully
- [ ] Dependencies installed (`npm install`)
- [ ] Import script ran without errors
- [ ] 2,919 exercises in database
- [ ] Can access `/dashboard/equipment`
- [ ] Can add/remove equipment
- [ ] Can access `/dashboard/exercises`
- [ ] Exercises are filtered by equipment
- [ ] Search and filters work

---

**Once all steps are complete, the exercise system is ready to use!** 🎉
