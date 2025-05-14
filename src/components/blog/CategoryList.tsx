import Link from 'next/link';
import { Category } from '@/lib/api';

interface CategoryListProps {
  categories: Category[];
  locale: string;
  activeCategory?: number;
}

export default function CategoryList({ categories, locale, activeCategory }: CategoryListProps) {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h3 className="mb-4 text-lg font-bold text-gray-900">Catégories</h3>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/${locale}/blog`}
          className={`inline-block rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            !activeCategory
              ? 'bg-[#E93E3A] text-white hover:bg-[#F3903F]'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Tous
        </Link>
        
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/${locale}/blog/category/${category.id}`}
            className={`inline-block rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeCategory === category.id
                ? 'bg-[#E93E3A] text-white hover:bg-[#F3903F]'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category.name}
          </Link>
        ))}
      </div>
    </div>
  );
} 