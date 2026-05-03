"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Article } from "@/lib/types";
import styles from "./page.module.css";

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Article>(`/articles/${params.id}`)
      .then(setArticle)
      .catch(() => router.push("/articles"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) return <main className={styles.page}><div className={styles.container}><div className="skeleton" style={{ height: 32, width: "60%", marginBottom: 16 }} /><div className="skeleton" style={{ height: 400 }} /></div></main>;
  if (!article) return null;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <button type="button" onClick={() => router.back()} className={styles.backBtn}>← Back to articles</button>
        <article className={styles.article}>
          <span className={styles.date}>{new Date(article.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
          <h1>{article.title}</h1>
          {article.author && <p className={styles.author}>By {article.author.full_name}</p>}
          <div className={styles.content}>{article.content.split("\n").map((paragraph, i) => {
            if (paragraph.startsWith("## ")) return <h2 key={i}>{paragraph.replace("## ", "")}</h2>;
            if (paragraph.trim() === "") return <br key={i} />;
            return <p key={i}>{paragraph}</p>;
          })}</div>
        </article>
      </div>
    </main>
  );
}
