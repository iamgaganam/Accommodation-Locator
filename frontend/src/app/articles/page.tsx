"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { Article } from "@/lib/types";
import styles from "./page.module.css";

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ articles: Article[] }>("/articles?limit=50")
      .then((d) => setArticles(d.articles || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Resources & Guides</h1>
          <p>Helpful articles about finding student accommodation in Plymouth</p>
        </div>
        {loading ? (
          <div className={styles.grid}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.card}>
                <div className="skeleton" style={{ height: 28, width: "80%", marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 16, width: "100%", marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 16, width: "60%" }} />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <p className={styles.empty}>No articles published yet.</p>
        ) : (
          <div className={styles.grid}>
            {articles.map((a) => (
              <Link key={a.id} href={`/articles/${a.id}`} className={styles.card}>
                <span className={styles.date}>{new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
                <h2>{a.title}</h2>
                <p>{a.content.substring(0, 150)}...</p>
                <span className={styles.readMore}>Read more →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
