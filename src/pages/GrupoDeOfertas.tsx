import { useEffect } from "react";

import { DEFAULT_OFFERS_GROUP_DESTINATION as GROUP_URL } from "@/lib/offers-group";

const GrupoDeOfertas = () => {
  useEffect(() => {
    window.location.replace(GROUP_URL);
  }, []);

  return (
    <main>
      <a href={GROUP_URL} target="_blank" rel="noopener noreferrer">Acessar o grupo de ofertas da Vitale</a>
    </main>
  );
};

export default GrupoDeOfertas;
