
import React, { useState } from 'react';
import { ChevronDown, ChevronLeft } from 'lucide-react';

interface FaqViewProps {
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
  getThemeClasses: (variant: string) => string;
  setCurrentView: (view: string) => void;
}

const FaqView: React.FC<FaqViewProps> = ({ t, getThemeClasses, setCurrentView }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const faqData = [
    { q: 'Hoe voeg ik nieuwe vakken toe?', a: 'Je kunt nieuwe vakken toevoegen of je selectie wijzigen via het \'Instellingen\' menu (tandwiel-icoon). Onder \'Account\' vind je de lijst met alle beschikbare vakken.' },
    { q: 'Hoe deel ik een bestand?', a: 'Binnen een vakoverzicht klik je op het "Bekijk" icoon naast een bestand. Hiermee open je het bestand in een nieuw tabblad, en de URL kun je vervolgens delen met anderen.' },
    { q: 'Waarom kan ik niet inloggen?', a: 'Controleer eerst of je e-mailadres en wachtwoord correct zijn. Als je je wachtwoord bent vergeten, gebruik dan de "Wachtwoord vergeten?" link op de inlogpagina. Zorg ook voor een stabiele internetverbinding. Soms kunnen problemen bij de server ook de oorzaak zijn.'},
    { q: 'Hoe werkt de studeertimer?', a: 'De studeertimer is gebaseerd op de Pomodoro-techniek. Stel een focustijd en een pauzetijd in. Start de timer voor een ononderbroken studiesessie. Na de sessie gaat er een belletje en begint je pauze.'},
    { q: 'Worden mijn gegevens opgeslagen?', a: 'Ja, al je bestanden, notities, taken en afspraken worden veilig opgeslagen en gekoppeld aan jouw persoonlijke account. Als je op een ander apparaat inlogt, heb je direct toegang tot al je gegevens.' },
    { q: 'Kan ik de app offline gebruiken?', a: 'De app heeft een actieve internetverbinding nodig om gegevens te synchroniseren met de cloud. Basisfuncties kunnen tijdelijk werken in offline modus, maar voor een volledige ervaring is een verbinding vereist.'}
  ];
  
  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center">
        <button type="button" onClick={() => setCurrentView('settings')} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
          <ChevronLeft />
        </button>
        <h2 className={`text-2xl font-bold text-center flex-grow ${getThemeClasses('text-strong')}`}>{t('faq')}</h2>
      </div>
      <div className={`p-4 rounded-lg space-y-3 ${getThemeClasses('bg-light')}`}>
        {faqData.map((item, index) => (
          <div key={index} className={`bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-300 border ${openFaq === index ? getThemeClasses('border') : 'border-transparent'}`}>
            <button
              onClick={() => toggleFaq(index)}
              className={`w-full flex justify-between items-center p-4 text-left font-semibold hover:bg-gray-50 transition-colors ${openFaq === index ? getThemeClasses('text') : ''}`}
            >
              <span>{item.q}</span>
              <ChevronDown className={`transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`} />
            </button>
            <div
              className="overflow-hidden transition-all duration-500 ease-in-out"
              style={{ maxHeight: openFaq === index ? '200px' : '0px', opacity: openFaq === index ? 1 : 0 }}
            >
              <div className="p-4 pt-0 text-gray-600">
                <p>{item.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FaqView;
