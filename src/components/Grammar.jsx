import { GrammarIcon } from './Icons.jsx';

// Раздел «Грамматика» — пока заглушка
export default function Grammar() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold-soft text-gold">
            <GrammarIcon size={26} />
          </div>
          <h2 className="font-serif text-xl font-bold tracking-wide text-ink">Грамматика</h2>
          <p className="mt-2 text-sm text-muted">Раздел в разработке. Скоро здесь появятся правила и упражнения.</p>
        </div>
      </div>
    </div>
  );
}
