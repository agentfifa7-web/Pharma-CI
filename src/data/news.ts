import type { NewsArticle } from '../types'

/**
 * Actualités santé — alimentées au démarrage par /data/actualites.json : articles publiés sur
 * pharmacies-de-garde.ci (titre, extrait, date, lien vers l'article d'origine).
 */
export const NEWS: NewsArticle[] = []

export function replaceNews(list: NewsArticle[]) {
  NEWS.splice(0, NEWS.length, ...list)
}

/** Catégories présentes dans les articles chargés. */
export const newsCategories = () => [...new Set(NEWS.map((n) => n.category))]

export const newsById = (id?: string) => NEWS.find((n) => n.id === id)
