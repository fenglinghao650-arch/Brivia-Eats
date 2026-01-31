export type AlertTrigger = {
  label: string;
  triggeredBy: { dishId: string; dishName: string }[];
};

type AlertableItem = {
  dishId: string;
  dishName: string;
  allergens: string[];
  dietaryFlags: string[];
};

const addTrigger = (
  map: Map<string, AlertTrigger>,
  label: string,
  dishId: string,
  dishName: string
) => {
  const existing = map.get(label);
  if (!existing) {
    map.set(label, { label, triggeredBy: [{ dishId, dishName }] });
    return;
  }
  if (!existing.triggeredBy.some((item) => item.dishId === dishId)) {
    existing.triggeredBy.push({ dishId, dishName });
  }
};

export const aggregateDietaryAlerts = (items: AlertableItem[]) => {
  const alertMap = new Map<string, AlertTrigger>();

  items.forEach((item) => {
    item.allergens.forEach((allergen) => {
      addTrigger(
        alertMap,
        `Allergen: ${allergen}`,
        item.dishId,
        item.dishName
      );
    });
    item.dietaryFlags.forEach((flag) => {
      addTrigger(alertMap, `Dietary: ${flag}`, item.dishId, item.dishName);
    });
  });

  return Array.from(alertMap.values());
};
