import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ─── user_profile ────────────────────────────────────────────────────────────
export const userProfile = sqliteTable('user_profile', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  age: integer('age'),
  weightKg: real('weight_kg'),
  heightCm: real('height_cm'),
  proteinGoalG: real('protein_goal_g'),
  carbsGoalG: real('carbs_goal_g'),
  fatGoalG: real('fat_goal_g'),
  caloriesGoal: integer('calories_goal'),
  sex: text('sex', { enum: ['female', 'male'] }).default('female'),
  activityLevel: text('activity_level', { enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'] }).default('moderate'),
  skinConditions: text('skin_conditions').default('[]'),   // JSON string[]
  backgroundContext: text('background_context'),            // contexte historique importé
  cycleLength: integer('cycle_length').default(28),
  lastPeriodDate: text('last_period_date'),
  lastAppleHealthSync: text('last_apple_health_sync'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
})

// ─── entries (check-in quotidien) ────────────────────────────────────────────
export const entries = sqliteTable('entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull().unique(),           // YYYY-MM-DD
  moment: text('moment', { enum: ['morning', 'evening'] }).default('morning'),
  photoPath: text('photo_path'),
  photoSource: text('photo_source', { enum: ['web', 'whatsapp', 'import'] }).default('web'),
  voiceTranscript: text('voice_transcript'),
  notes: text('notes'),
  source: text('source', { enum: ['web', 'whatsapp', 'import'] }).default('web'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

// ─── skin_analyses ───────────────────────────────────────────────────────────
export const skinAnalyses = sqliteTable('skin_analyses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entryId: integer('entry_id').references(() => entries.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),

  // 8 dimensions glass skin (0-10)
  acneScore: real('acne_score'),
  hydrationScore: real('hydration_score'),
  radianceScore: real('radiance_score'),
  textureScore: real('texture_score'),
  firmnessScore: real('firmness_score'),
  evennessScore: real('evenness_score'),
  fineLinesScore: real('fine_lines_score'),
  barrierScore: real('barrier_score'),
  rosaceaScore: real('rosacea_score'),

  // Score composite
  glassSkinScore: real('glass_skin_score'),

  // Zones anatomiques JSON: { front: {...}, joues: {...}, menton: {...}, ... }
  zones: text('zones').default('{}'),

  // Lésions actives JSON: { count: number, picking: boolean, infected: boolean }
  lesionsActive: text('lesions_active').default('{}'),

  // Tendances
  vsYesterday: text('vs_yesterday'),      // "amélioration" | "stable" | "dégradation"
  summary: text('summary'),
  immediateRecos: text('immediate_recos'), // JSON string[]
  routineForTonight: text('routine_for_tonight'), // JSON string[]

  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

// ─── lesions (tracking individuel) ──────────────────────────────────────────
export const lesions = sqliteTable('lesions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entryId: integer('entry_id').references(() => entries.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  zone: text('zone').notNull(),
  type: text('type', { enum: ['papule', 'pustule', 'kyste', 'comedone', 'microkyst'] }),
  size: text('size', { enum: ['small', 'medium', 'large'] }),
  stage: text('stage', { enum: ['new', 'active', 'healing', 'resolved'] }).default('new'),
  picking: integer('picking', { mode: 'boolean' }).default(false),
  infected: integer('infected', { mode: 'boolean' }).default(false),
  treatments: text('treatments').default('[]'), // JSON string[]
  resolvedAt: text('resolved_at'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

// ─── daily_factors ───────────────────────────────────────────────────────────
export const dailyFactors = sqliteTable('daily_factors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entryId: integer('entry_id').references(() => entries.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),

  // Triggers rosacée
  heatExposure: integer('heat_exposure', { mode: 'boolean' }).default(false),
  sunExposure: integer('sun_exposure', { mode: 'boolean' }).default(false),
  spicyFood: integer('spicy_food', { mode: 'boolean' }).default(false),
  alcohol: integer('alcohol', { mode: 'boolean' }).default(false),
  hotDrinks: integer('hot_drinks', { mode: 'boolean' }).default(false),
  intensiveExercise: integer('intensive_exercise', { mode: 'boolean' }).default(false),
  stress: integer('stress', { mode: 'boolean' }).default(false),
  flush: integer('flush', { mode: 'boolean' }).default(false),
  newProduct: integer('new_product', { mode: 'boolean' }).default(false),

  // Sommeil
  sleepHours: real('sleep_hours'),
  sleepQuality: integer('sleep_quality'),  // 1-5

  // Activité physique
  exerciseType: text('exercise_type'),
  exerciseIntensity: text('exercise_intensity', { enum: ['light', 'moderate', 'intense'] }),
  exerciseDurationMin: integer('exercise_duration_min'),
  exerciseSource: text('exercise_source', { enum: ['vocal', 'apple_health', 'manual'] }),

  // Cycle menstruel (jour du cycle)
  cycleDay: integer('cycle_day'),
  cyclePhase: text('cycle_phase', { enum: ['follicular', 'ovulation', 'luteal', 'menstrual'] }),

  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

// ─── products ────────────────────────────────────────────────────────────────
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  brand: text('brand'),
  category: text('category', { enum: ['cleanser', 'toner', 'serum', 'moisturizer', 'spf', 'mask', 'exfoliant', 'eye', 'oil', 'other'] }),
  inciRaw: text('inci_raw'),
  notes: text('notes'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  firstUsedAt: text('first_used_at'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

// ─── inci_ingredients ────────────────────────────────────────────────────────
export const inciIngredients = sqliteTable('inci_ingredients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  inci: text('inci').notNull(),
  riskLevel: integer('risk_level'),   // 1-5
  functions: text('functions').default('[]'), // JSON string[]
  concerns: text('concerns').default('[]'),   // JSON string[]
  comedogenic: integer('comedogenic'),        // 0-5
  irritant: integer('irritant', { mode: 'boolean' }).default(false),
  allergen: integer('allergen', { mode: 'boolean' }).default(false),
  // Corrélation × zones (calculée progressivement)
  zoneCorrelations: text('zone_correlations').default('{}'), // JSON { zone: { impact, confidence, dataPoints } }
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

// ─── combos ──────────────────────────────────────────────────────────────────
export const combos = sqliteTable('combos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['routine', 'meal'] }).notNull(),
  description: text('description'),
  items: text('items').notNull().default('[]'),  // JSON: productIds[] ou aliments[]
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  usageCount: integer('usage_count').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

// ─── nutrition_logs ───────────────────────────────────────────────────────────
export const nutritionLogs = sqliteTable('nutrition_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entryId: integer('entry_id').references(() => entries.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  description: text('description'),    // texte libre du vocal
  foods: text('foods').default('[]'),  // JSON: { name, quantityG, protein, carbs, fat, calories }[]

  // Macros totaux du repas/journée
  proteinG: real('protein_g'),
  carbsG: real('carbs_g'),
  fatG: real('fat_g'),
  fiberG: real('fiber_g'),
  calories: integer('calories'),

  macrosSource: text('macros_source', {
    enum: ['user_provided', 'estimated_by_ai', 'known_foods_db', 'mixed'],
  }).default('estimated_by_ai'),
  macrosConfidence: real('macros_confidence'), // 0-1

  meal: text('meal', { enum: ['breakfast', 'lunch', 'dinner', 'snack', 'full_day'] }).default('full_day'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

// ─── known_foods ─────────────────────────────────────────────────────────────
export const knownFoods = sqliteTable('known_foods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  aliases: text('aliases').default('[]'),   // JSON string[]
  // Macros pour 100g
  caloriesPer100g: real('calories_per_100g'),
  proteinPer100g: real('protein_per_100g'),
  carbsPer100g: real('carbs_per_100g'),
  fatPer100g: real('fat_per_100g'),
  fiberPer100g: real('fiber_per_100g'),
  category: text('category'),   // viande, légume, féculents, etc.
  inflammatoryIndex: real('inflammatory_index'),  // -3 à +3
  isDairy: integer('is_dairy', { mode: 'boolean' }).default(false),
  isGluten: integer('is_gluten', { mode: 'boolean' }).default(false),
  isOmega3Source: integer('is_omega3_source', { mode: 'boolean' }).default(false),
  isZincSource: integer('is_zinc_source', { mode: 'boolean' }).default(false),
  timesLogged: integer('times_logged').default(1),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

// ─── whatsapp_sessions ───────────────────────────────────────────────────────
export const whatsappSessions = sqliteTable('whatsapp_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  from: text('from').notNull().unique(),
  step: integer('step').notNull().default(1),  // 1=photo reçue, 2=vocal reçu/questions
  photoPath: text('photo_path'),
  photoMediaId: text('photo_media_id'),
  pendingQuestions: text('pending_questions').default('[]'),  // JSON string[]
  questionsAsked: integer('questions_asked').default(0),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

// ─── chat_session ────────────────────────────────────────────────────────────
export const chatSession = sqliteTable('chat_session', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  step: text('step', { enum: ['idle', 'awaiting_context'] }).notNull().default('idle'),
  pendingPhotoPath: text('pending_photo_path'),
  pendingPhotoBase64: text('pending_photo_base64'), // temporaire, effacé après analyse
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
})

// ─── chat_messages ────────────────────────────────────────────────────────────
export const chatMessages = sqliteTable('chat_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  type: text('type', { enum: ['text', 'photo', 'audio', 'analysis', 'buttons'] }).notNull().default('text'),
  content: text('content').notNull(),
  mediaPath: text('media_path'),
  buttons: text('buttons').default('[]'), // JSON string[]
  analysisId: integer('analysis_id'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

// ─── evolution_proposals ─────────────────────────────────────────────────────
export const evolutionProposals = sqliteTable('evolution_proposals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  trigger: text('trigger').notNull(),         // signal détecté
  description: text('description').notNull(),
  proposedChanges: text('proposed_changes').notNull(), // JSON description des changements
  status: text('status', {
    enum: ['pending', 'confirmed', 'executing', 'applied', 'rejected'],
  }).default('pending'),
  prUrl: text('pr_url'),
  confirmedAt: text('confirmed_at'),
  appliedAt: text('applied_at'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})
