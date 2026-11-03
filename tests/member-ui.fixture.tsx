// Development-only UI harness; no route or entry in the production bundle.
import React from "react";
import { createRoot } from "react-dom/client";
import { MemberAccount } from "../src/components/members/MemberAccount";
import ArticleComments from "../src/components/members/ArticleComments";
import { CommentModeration } from "../src/components/members/CommentModeration";
import "../src/styles.css";
const view = new URLSearchParams(location.search).get("view");
createRoot(document.getElementById("root")!).render(
  view === "comments" ? <ArticleComments articleId="10000000-0000-4000-8000-000000000001" slug="artigo-teste" /> :
  view === "moderation" ? <CommentModeration /> :
  <main className="mx-auto max-w-xl p-4"><MemberAccount initialMode="perfil" returnTo="/conteudos/artigo-teste" /></main>,
);
