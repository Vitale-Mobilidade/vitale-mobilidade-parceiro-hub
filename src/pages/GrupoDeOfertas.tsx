import { useEffect } from "react";
import { OFFERS_GROUP_URL } from "@/lib/offers-group";

const GrupoDeOfertas = () => {
  useEffect(() => {
    window.location.replace(OFFERS_GROUP_URL);
  }, []);

  return (
    <main>
      <a href={OFFERS_GROUP_URL}>Acessar o grupo de ofertas da Vitale</a>
    </main>
  );
};

export default GrupoDeOfertas;