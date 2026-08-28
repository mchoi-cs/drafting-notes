import type { Metadata } from "next";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { getExercisesByCategory } from "@/lib/exercises";
import { CATEGORIES } from "@/lib/site";

const category = CATEGORIES["drafting-meta"];

export const metadata: Metadata = {
  title: category.label,
};

export default function DraftingMetaPage() {
  const posts = getExercisesByCategory("drafting-meta");

  return (
    <div className="page-narrow">
      <h1 className="page-title">{category.label}</h1>
      <p className="page-lede">{category.lede}</p>

      {posts.length === 0 ? (
        <p className="page-lede">No notes yet.</p>
      ) : (
        <ul className="blog-list">
          {posts.map((post) => (
            <li key={post.slug} className="blog-list-item">
              <Link href={post.href}>
                <h2 className="blog-item-title">{post.title}</h2>
                <p className="blog-item-meta">
                  {post.date
                    ? format(parseISO(post.date), "MMMM d, yyyy")
                    : "Draft"}
                  {post.readingTime ? ` · ${post.readingTime}` : ""}
                </p>
                {post.excerpt ? (
                  <p className="blog-item-excerpt">{post.excerpt}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
