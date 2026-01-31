import { menu, restaurant } from "@/src/mock";

type RestaurantPageProps = {
  params: { restaurantId: string };
};

export default function RestaurantPage(_: RestaurantPageProps) {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="border-b border-zinc-100">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="text-sm font-semibold">Brivia Eats</div>
          <div className="text-xs text-zinc-400">Menu empowered by Brivia</div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="rounded-xl border border-zinc-100 px-4 py-5 sm:rounded-2xl sm:px-6 sm:py-6">
          <div className="text-xs uppercase tracking-[0.3em] text-zinc-400">
            Restaurant
          </div>
          <h1 className="mt-2 text-xl font-semibold sm:text-2xl">
            {restaurant.name_en}
          </h1>
          <div className="mt-1 text-sm text-zinc-500">
            {restaurant.name_zh}
          </div>
          <div className="mt-3 text-sm text-zinc-600">
            {restaurant.location_display}
          </div>
          <div className="mt-1 text-sm text-zinc-600">
            {restaurant.cuisine_display}
          </div>
          <p className="mt-2 text-sm text-zinc-600">
            Confidence-focused menu. No payments, no login.
          </p>
        </div>

        <section className="mt-4 space-y-4 sm:mt-6">
          <div className="rounded-xl border border-zinc-100 px-4 py-4 sm:rounded-2xl sm:px-6 sm:py-5">
            <div className="text-sm font-semibold">Main Menu</div>
            <p className="mt-2 text-sm text-zinc-600">
              Browse the food and order like a local!
            </p>
            <a
              className="mt-4 inline-flex rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white sm:px-4 sm:py-2"
              href={`/m/${menu.id}`}
            >
              Open menu
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
