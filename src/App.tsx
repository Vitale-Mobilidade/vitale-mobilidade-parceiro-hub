import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import EscolherBike from "./pages/EscolherBike";
import PainelBikes from "./pages/PainelBikes";
import Acompanhamento from "./pages/Acompanhamento";
import AcompanhamentoBike from "./pages/AcompanhamentoBike";
import NotFound from "./pages/NotFound";
import { RadarAssistant } from "./components/radar/RadarAssistant";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/escolherbike" element={<EscolherBike />} />
      <Route path="/painel-bikes" element={<PainelBikes />} />
      <Route path="/acompanhamento" element={<Acompanhamento />} />
      <Route path="/acompanhamento/:bikeId" element={<AcompanhamentoBike />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    {/* Assistente Vitale: instância única. /escolherbike monta a sua própria. */}
    <RadarAssistant />
  </BrowserRouter>
);

export default App;
