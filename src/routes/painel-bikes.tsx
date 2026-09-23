import { createFileRoute } from "@tanstack/react-router";
import PainelBikes from "@/pages/PainelBikes";

export const Route = createFileRoute("/painel-bikes")({ component: PainelBikes });
