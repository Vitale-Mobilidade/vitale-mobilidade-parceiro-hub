import { createServerFn } from "@tanstack/react-start";
import { fetchPublishedArticle, fetchPublishedIndex } from "./editorial-repository.server";

export const getPublishedArticle = createServerFn({ method: "GET" })
  .inputValidator((v: unknown) => typeof v === "string" ? v : "")
  .handler(async ({ data }) => fetchPublishedArticle(data));

export const getPublishedArticles = createServerFn({ method: "GET" })
  .handler(async () => fetchPublishedIndex());
