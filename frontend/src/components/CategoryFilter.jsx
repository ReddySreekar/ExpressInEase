import { CATEGORIES } from '../api';

export default function CategoryFilter({ active, onChange }) {
  return (
    <div className="category-filter" id="category-filter">
      {CATEGORIES.map(cat => (
        <button
          key={cat.key}
          id={`cat-${cat.key}`}
          className={`category-chip ${active === cat.key ? 'category-chip--active' : ''}`}
          onClick={() => onChange(cat.key)}
        >
          <span className="category-chip__emoji">{cat.emoji}</span>
          {cat.label}
        </button>
      ))}
    </div>
  );
}
