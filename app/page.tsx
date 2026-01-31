import { restaurant } from "@/src/mock";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Brivia Eats</h1>
          <p className="mt-3 text-lg text-zinc-600">Menu empowered by Brivia</p>
        </div>
        <div className="rounded-2xl border border-zinc-100 px-6 py-6">
          <div className="text-xs uppercase tracking-[0.3em] text-zinc-400">
            Demo entry
          </div>
          <p className="mt-2 text-sm text-zinc-600">
            Start at the restaurant landing page and open the menu.
          </p>
          <a
            className="mt-4 inline-flex rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            href={`/r/${restaurant.id}`}
          >
            View restaurant
          </a>
        </div>
      </main>
    </div>
  );
}
