export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="max-w-sm mx-auto mt-20">
      <h1 className="text-2xl font-bold text-white mb-6">Acces admin</h1>
      <form
        action="/api/admin/login"
        method="POST"
        className="space-y-4 rounded-lg border border-white/10 bg-zinc-900/70 p-6"
      >
        <label className="block">
          <span className="text-sm text-gray-300">Mot de passe</span>
          <input
            type="password"
            name="password"
            autoFocus
            required
            className="mt-1 block w-full rounded bg-zinc-800 border border-white/10 text-white px-3 py-2 outline-none focus:border-violet-500"
          />
        </label>
        {error && (
          <p className="text-sm text-red-300">Mot de passe incorrect.</p>
        )}
        <button
          type="submit"
          className="w-full rounded bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 font-medium transition"
        >
          Se connecter
        </button>
      </form>
    </div>
  );
}
