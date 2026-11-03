import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchPublicBikeListings } from "./bike-classifieds-repository.server";
export const getPublicBikeListings = createServerFn({ method: "GET" })
  .inputValidator((v: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).default(12),
        offset: z.number().int().min(0).max(10000).default(0),
      })
      .parse(v ?? {}),
  )
  .handler(async ({ data }) =>
    fetchPublicBikeListings(data.id, data.limit, data.offset),
  );
