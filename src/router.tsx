import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { parseCampaignSearch, stringifyCampaignSearch } from "@/lib/quiz-attribution";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    parseSearch: parseCampaignSearch,
    stringifySearch: stringifyCampaignSearch,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
