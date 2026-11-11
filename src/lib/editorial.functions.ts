import { createServerFn } from "@tanstack/react-start";
import { fetchReleasedSpotifyEpisode } from "./podcast-delivery.server";
import {
  fetchPublishedArticle,
  fetchPublishedArticleResult,
  fetchPublishedArticlesForBike,
  fetchPublishedIndex,
} from "./editorial-repository.server";

export const getPublishedArticle = createServerFn({ method: "GET" })
  .inputValidator((v: unknown) => (typeof v === "string" ? v : ""))
  .handler(async ({ data }) => fetchPublishedArticle(data));

export const getPublishedArticleResult = createServerFn({ method: "GET" })
  .inputValidator((v: unknown) => (typeof v === "string" ? v : ""))
  .handler(async ({ data }) => fetchPublishedArticleResult(data));

export const getPublishedArticles = createServerFn({ method: "GET" }).handler(
  async () => fetchPublishedIndex(),
);

export const getPublishedArticlesForBike = createServerFn({ method: "GET" })
  .inputValidator((v: unknown) => (typeof v === "string" ? v : ""))
  .handler(async ({ data }) => fetchPublishedArticlesForBike(data));

export const getReleasedSpotifyEpisode = createServerFn({ method: "GET" })
  .inputValidator((v: unknown) => (typeof v === "string" ? v : ""))
  .handler(async ({ data }) => fetchReleasedSpotifyEpisode(data));
