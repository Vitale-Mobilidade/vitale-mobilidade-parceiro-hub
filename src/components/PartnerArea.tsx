
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, FileText, Download, Users, CheckCircle } from 'lucide-react';

interface VideoLesson {
  id: string;
  title: string;
  duration: string;
  description: string;
  videoUrl: string;
  level: 'free' | 'partner' | 'premium';
}

interface Material {
  id: string;
  title: string;
  type: 'pdf' | 'checklist' | 'presentation';
  description: string;
  downloadUrl: string;
  level: 'free' | 'partner' | 'premium';
}

interface SuccessCase {
  id: string;
  partnerName: string;
  businessName: string;
  story: string;
  results: string;
  image: string;
}

interface Tip {
  id: string;
  title: string;
  content: string;
  category: string;
}

const PartnerArea = () => {
  const [selectedVideo, setSelectedVideo] = useState<VideoLesson | null>(null);

  const videoLessons: VideoLesson[] = [
    {
      id: '1',
      title: 'Como Posicionar Veículos Elétricos no Mercado',
      duration: '15:30',
      description: 'Aprenda as melhores estratégias para apresentar veículos elétricos aos seus clientes.',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      level: 'free'
    },
    {
      id: '2',
      title: 'Quebrar Objeções de Clientes',
      duration: '22:15',
      description: 'Técnicas eficazes para superar as principais objeções sobre veículos elétricos.',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      level: 'partner'
    },
    {
      id: '3',
      title: 'Marketing Local para Lojistas',
      duration: '18:45',
      description: 'Estratégias de marketing digital e local para aumentar suas vendas.',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      level: 'premium'
    }
  ];

  const materials: Material[] = [
    {
      id: '1',
      title: 'Guia Completo de Vendas',
      type: 'pdf',
      description: 'Manual completo com técnicas de vendas para veículos elétricos.',
      downloadUrl: '#',
      level: 'free'
    },
    {
      id: '2',
      title: 'Checklist de Atendimento',
      type: 'checklist',
      description: 'Lista de verificação para um atendimento perfeito ao cliente.',
      downloadUrl: '#',
      level: 'partner'
    },
    {
      id: '3',
      title: 'Apresentação Comercial',
      type: 'presentation',
      description: 'Slides prontos para apresentar aos seus clientes.',
      downloadUrl: '#',
      level: 'premium'
    }
  ];

  const successCases: SuccessCase[] = [
    {
      id: '1',
      partnerName: 'Marina Santos',
      businessName: 'EcoBike Campinas',
      story: 'Começou como revendedora com apenas 3 bicicletas elétricas e hoje é líder de vendas na região.',
      results: '200% de crescimento em 6 meses',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'
    },
    {
      id: '2',
      partnerName: 'João Silva',
      businessName: 'Mobilidade Verde SP',
      story: 'Transformou sua loja de bicicletas tradicionais focando apenas em veículos elétricos.',
      results: 'Faturamento 5x maior',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'
    }
  ];

  const tips: Tip[] = [
    {
      id: '1',
      title: 'Demonstração é Fundamental',
      content: 'Sempre ofereça um test-drive. A experiência de dirigir um veículo elétrico convence mais que qualquer argumento.',
      category: 'Vendas'
    },
    {
      id: '2',
      title: 'Foque na Economia',
      content: 'Calcule junto com o cliente a economia mensal com combustível e manutenção.',
      category: 'Argumentação'
    },
    {
      id: '3',
      title: 'Crie Urgência Positiva',
      content: 'Mostre como a mobilidade elétrica é o futuro e que quem aderir primeiro sai na frente.',
      category: 'Fechamento'
    }
  ];

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'free':
        return <Badge variant="secondary">Gratuito</Badge>;
      case 'partner':
        return <Badge variant="default">Parceiro</Badge>;
      case 'premium':
        return <Badge variant="destructive">Premium</Badge>;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'checklist':
        return <CheckCircle className="h-4 w-4" />;
      case 'presentation':
        return <Download className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <section id="area-parceiro" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Área do <span className="text-gradient-green">Parceiro</span>
          </h2>
          <p className="text-xl text-gray-600">
            Plataforma de aprendizado exclusiva para revendedores Vitale
          </p>
        </div>

        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="videos">Vídeo Aulas</TabsTrigger>
            <TabsTrigger value="materials">Materiais</TabsTrigger>
            <TabsTrigger value="cases">Casos de Sucesso</TabsTrigger>
            <TabsTrigger value="tips">Dicas Práticas</TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Biblioteca de Vídeos</h3>
                {videoLessons.map((lesson) => (
                  <Card key={lesson.id} className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedVideo(lesson)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{lesson.title}</h4>
                        {getLevelBadge(lesson.level)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{lesson.description}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Play className="h-4 w-4" />
                        <span>{lesson.duration}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div>
                {selectedVideo ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {selectedVideo.title}
                        {getLevelBadge(selectedVideo.level)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center mb-4">
                        <div className="text-center">
                          <Play className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600">Vídeo: {selectedVideo.title}</p>
                          <p className="text-sm text-gray-500">Duração: {selectedVideo.duration}</p>
                        </div>
                      </div>
                      <p className="text-gray-700">{selectedVideo.description}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Play className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">Selecione uma aula para assistir</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="materials" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {materials.map((material) => (
                <Card key={material.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(material.type)}
                        <span>{material.title}</span>
                      </div>
                      {getLevelBadge(material.level)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{material.description}</p>
                    <Button className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Material
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="cases" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {successCases.map((case_) => (
                <Card key={case_.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <img 
                        src={case_.image} 
                        alt={case_.partnerName}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-semibold">{case_.partnerName}</h4>
                        <p className="text-sm text-gray-600">{case_.businessName}</p>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-4">{case_.story}</p>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-green-700 font-medium">Resultado: {case_.results}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tips" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tips.map((tip) => (
                <Card key={tip.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{tip.title}</CardTitle>
                    <Badge variant="outline">{tip.category}</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{tip.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default PartnerArea;
