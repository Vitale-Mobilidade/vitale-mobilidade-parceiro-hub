import { createServerFn } from "@tanstack/react-start";
import { fetchOffersGroupDestination } from "./offers-group-repository.server";
export const getOffersGroupDestination = createServerFn({
  method: "GET",
}).handler(fetchOffersGroupDestination);
