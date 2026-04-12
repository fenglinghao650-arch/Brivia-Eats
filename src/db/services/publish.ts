/**
 * Publish Service for Brivia Eats
 * 
 * Handles the workflow of publishing a menu from working tables to immutable snapshots.
 * 
 * Critical guarantees:
 * - All dishes must be approved before publish
 * - Snapshots are immutable once created
 * - Rollback is possible by switching the current_snapshot_id pointer
 */

import { createHash } from 'crypto';
import { db, TransactionClient } from '../index';
import {
  DbRestaurant,
  DbMenu,
  DbDish,
  DbDishIngredient,
  DbMedia,
  DbMenuSnapshot,
  DbDishSnapshot,
  IngredientRef,
  PhotoUrl,
  ConfidenceFlags,
  UUID,
} from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface PublishResult {
  success: boolean;
  snapshot_id?: UUID;
  version?: number;
  error?: string;
}

export interface PublishValidation {
  valid: boolean;
  errors: string[];
}

interface DishWithIngredients extends DbDish {
  ingredients: DbDishIngredient[];
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate that a menu is ready for publishing
 */
export async function validateMenuForPublish(menuId: UUID): Promise<PublishValidation> {
  const errors: string[] = [];

  // Get menu
  const menu = await db.queryOne<DbMenu>(
    'SELECT * FROM menus WHERE id = $1',
    [menuId]
  );

  if (!menu) {
    return { valid: false, errors: ['Menu not found'] };
  }

  // Check menu status
  if (menu.review_status !== 'approved') {
    errors.push(`Menu review_status must be 'approved', got '${menu.review_status}'`);
  }

  // Get all dishes for this menu
  const dishes = await db.query<DbDish>(
    'SELECT * FROM dishes WHERE menu_id = $1',
    [menuId]
  );

  if (dishes.length === 0) {
    errors.push('Menu has no dishes');
  }

  // Validate each dish
  for (const dish of dishes) {
    if (dish.status !== 'published') {
      errors.push(`Dish "${dish.romanized_name}" (${dish.id}): status must be 'published', got '${dish.status}'`);
    }
    if (dish.review_status !== 'approved') {
      errors.push(`Dish "${dish.romanized_name}" (${dish.id}): review_status must be 'approved', got '${dish.review_status}'`);
    }
    // Safety-critical fields must be confirmed
    if (dish.allergen_confidence === 'unknown' && dish.allergens.length > 0) {
      errors.push(`Dish "${dish.romanized_name}" (${dish.id}): allergens present but not confirmed`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// SNAPSHOT CREATION
// =============================================================================

/**
 * Create a snapshot of a dish with all denormalized data
 */
async function createDishSnapshot(
  tx: TransactionClient,
  menuSnapshotId: UUID,
  dish: DishWithIngredients,
  media: DbMedia[],
  sectionId: string | null,
  sortOrder: number
): Promise<UUID> {
  // Convert ingredients to JSONB format
  const ingredients: IngredientRef[] = dish.ingredients.map((i) => ({
    name_native: i.name_native,
    name_en: i.name_en ?? undefined,
    is_hidden: i.is_hidden,
    notes_en: i.notes_en ?? undefined,
  }));

  // Get media URLs for this dish
  const dishMedia = media.filter(
    (m) => m.owner_type === 'dish' && m.owner_id === dish.id
  );
  const photoUrls: PhotoUrl[] = dishMedia.map((m) => ({
    url: m.url,
    role: m.role,
    is_primary: m.is_primary,
  }));

  // Build confidence flags
  const confidenceFlags: ConfidenceFlags = {
    allergen_confidence: dish.allergen_confidence,
    dietary_confidence: dish.dietary_confidence,
    spice_confidence: dish.spice_confidence,
  };

  const result = await tx.query<{ id: UUID }>(
    `INSERT INTO dish_snapshots (
      menu_snapshot_id, dish_id, native_name, romanized_name, clarity_name_en,
      one_line_story_en, price, currency, spice_level, allergens, dietary_flags,
      cooking_methods, flavor_profile_tags, ingredients, hidden_ingredients_notes_en,
      variations, photo_urls, provenance, confidence_flags, section_id, sort_order
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
    ) RETURNING id`,
    [
      menuSnapshotId,
      dish.id,
      dish.native_name,
      dish.romanized_name,
      dish.clarity_name_en,
      dish.one_line_story_en,
      dish.price,
      dish.currency,
      dish.spice_level,
      dish.allergens,
      dish.dietary_flags,
      dish.cooking_methods,
      dish.flavor_profile_tags,
      JSON.stringify(ingredients),
      dish.hidden_ingredients_notes_en,
      JSON.stringify(dish.variations),
      JSON.stringify(photoUrls),
      JSON.stringify(dish.provenance),
      JSON.stringify(confidenceFlags),
      sectionId,
      sortOrder,
    ]
  );

  return result[0].id;
}

/**
 * Generate a checksum for the snapshot content
 */
function generateChecksum(data: object): string {
  const json = JSON.stringify(data, Object.keys(data).sort());
  return createHash('sha256').update(json).digest('hex');
}

// =============================================================================
// MAIN PUBLISH FUNCTION
// =============================================================================

/**
 * Publish a menu by creating an immutable snapshot
 * 
 * @param menuId - The working menu ID to publish
 * @param publishedBy - User ID of the publisher
 * @returns PublishResult with snapshot_id and version on success
 */
export async function publishMenu(
  menuId: UUID,
  publishedBy?: UUID
): Promise<PublishResult> {
  // Validate first
  const validation = await validateMenuForPublish(menuId);
  if (!validation.valid) {
    return {
      success: false,
      error: `Validation failed: ${validation.errors.join('; ')}`,
    };
  }

  try {
    return await db.transaction(async (tx) => {
      // Get menu with restaurant
      const menu = await tx.queryOne<DbMenu>(
        'SELECT * FROM menus WHERE id = $1 FOR UPDATE',
        [menuId]
      );
      if (!menu) {
        throw new Error('Menu not found');
      }

      const restaurant = await tx.queryOne<DbRestaurant>(
        'SELECT * FROM restaurants WHERE id = $1',
        [menu.restaurant_id]
      );
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // Get all dishes with ingredients
      const dishRows = await tx.query<DbDish & { ingredients_json: string }>(
        `SELECT d.*, 
          COALESCE(
            json_agg(
              json_build_object(
                'id', di.id,
                'dish_id', di.dish_id,
                'name_native', di.name_native,
                'name_en', di.name_en,
                'is_hidden', di.is_hidden,
                'notes_en', di.notes_en,
                'sort_order', di.sort_order
              ) ORDER BY di.sort_order
            ) FILTER (WHERE di.id IS NOT NULL),
            '[]'
          )::text as ingredients_json
        FROM dishes d
        LEFT JOIN dish_ingredients di ON di.dish_id = d.id
        WHERE d.menu_id = $1
        GROUP BY d.id`,
        [menuId]
      );

      const dishes: DishWithIngredients[] = dishRows.map((row) => ({
        ...row,
        ingredients: JSON.parse(row.ingredients_json || '[]'),
      }));

      // Get all media for restaurant and dishes
      const allMedia = await tx.query<DbMedia>(
        `SELECT * FROM media 
         WHERE (owner_type = 'restaurant' AND owner_id = $1)
            OR (owner_type = 'dish' AND owner_id = ANY($2))`,
        [restaurant.id, dishes.map((d) => d.id)]
      );

      // Get next version number
      const versionResult = await tx.queryOne<{ max_version: number | null }>(
        'SELECT MAX(version) as max_version FROM menu_snapshots WHERE menu_id = $1',
        [menuId]
      );
      const nextVersion = (versionResult?.max_version ?? 0) + 1;

      // Build snapshot content for checksum
      const snapshotContent = {
        restaurant: restaurant,
        menu: menu,
        dishes: dishes,
        media: allMedia,
      };
      const checksum = generateChecksum(snapshotContent);

      // Create menu snapshot (bilingual: title_native + title_en)
      const menuSnapshotResult = await tx.query<{ id: UUID }>(
        `INSERT INTO menu_snapshots (
          menu_id, restaurant_id, version, restaurant_snapshot,
          title_native, title_en, description_native, description_en, 
          sections, published_by, checksum
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          menuId,
          restaurant.id,
          nextVersion,
          JSON.stringify(restaurant),
          menu.title_native,
          menu.title_en,
          menu.description_native,
          menu.description_en,
          JSON.stringify(menu.sections),
          publishedBy,
          checksum,
        ]
      );
      const menuSnapshotId = menuSnapshotResult[0].id;

      // Create dish snapshots
      let sortOrder = 0;
      for (const dish of dishes) {
        await createDishSnapshot(
          tx,
          menuSnapshotId,
          dish,
          allMedia,
          null, // TODO: Extract from menu.sections
          sortOrder++
        );
      }

      // Create snapshot_media entries
      for (const media of allMedia) {
        await tx.execute(
          `INSERT INTO snapshot_media (
            menu_snapshot_id, original_media_id, url, role, owner_type, owner_id, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            menuSnapshotId,
            media.id,
            media.url,
            media.role,
            media.owner_type,
            media.owner_id,
            media.sort_order,
          ]
        );
      }

      // Update or insert published_menus pointer
      await tx.execute(
        `INSERT INTO published_menus (restaurant_id, current_snapshot_id, published_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (restaurant_id) 
         DO UPDATE SET current_snapshot_id = $2, published_at = now(), published_by = $3`,
        [restaurant.id, menuSnapshotId, publishedBy]
      );

      // Update menu status
      await tx.execute(
        `UPDATE menus SET status = 'published', published_at = now(), published_by = $1 WHERE id = $2`,
        [publishedBy, menuId]
      );

      // Log the change
      await tx.execute(
        `INSERT INTO change_logs (entity_type, entity_id, changed_by, changed_fields, reason)
         VALUES ('menu', $1, $2, $3, $4)`,
        [menuId, publishedBy, ['status', 'published_at'], `Published as version ${nextVersion}`]
      );

      return {
        success: true,
        snapshot_id: menuSnapshotId,
        version: nextVersion,
      };
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// ROLLBACK
// =============================================================================

/**
 * Rollback to a previous snapshot version
 */
export async function rollbackToVersion(
  restaurantId: UUID,
  version: number,
  rolledBackBy?: UUID
): Promise<PublishResult> {
  try {
    return await db.transaction(async (tx) => {
      // Find the snapshot
      const snapshot = await tx.queryOne<DbMenuSnapshot>(
        'SELECT * FROM menu_snapshots WHERE restaurant_id = $1 AND version = $2',
        [restaurantId, version]
      );

      if (!snapshot) {
        return {
          success: false,
          error: `Snapshot version ${version} not found for restaurant ${restaurantId}`,
        };
      }

      // Update the pointer
      await tx.execute(
        `UPDATE published_menus 
         SET current_snapshot_id = $1, published_at = now(), published_by = $2
         WHERE restaurant_id = $3`,
        [snapshot.id, rolledBackBy, restaurantId]
      );

      // Log the change
      await tx.execute(
        `INSERT INTO change_logs (entity_type, entity_id, changed_by, changed_fields, reason)
         VALUES ('menu', $1, $2, $3, $4)`,
        [snapshot.menu_id, rolledBackBy, ['current_snapshot_id'], `Rolled back to version ${version}`]
      );

      return {
        success: true,
        snapshot_id: snapshot.id,
        version: version,
      };
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get the currently published menu for a restaurant (for public display)
 */
export async function getPublishedMenu(restaurantId: UUID) {
  const snapshot = await db.queryOne<DbMenuSnapshot>(
    `SELECT ms.* 
     FROM published_menus pm
     JOIN menu_snapshots ms ON ms.id = pm.current_snapshot_id
     WHERE pm.restaurant_id = $1`,
    [restaurantId]
  );

  if (!snapshot) {
    return null;
  }

  const dishes = await db.query<DbDishSnapshot>(
    `SELECT * FROM dish_snapshots 
     WHERE menu_snapshot_id = $1
     ORDER BY section_id, sort_order`,
    [snapshot.id]
  );

  return {
    snapshot,
    dishes,
  };
}

/**
 * List all snapshot versions for a menu
 */
export async function listSnapshots(menuId: UUID) {
  return db.query<DbMenuSnapshot>(
    'SELECT * FROM menu_snapshots WHERE menu_id = $1 ORDER BY version DESC',
    [menuId]
  );
}
