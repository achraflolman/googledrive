
import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface InfoViewProps {
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
  getThemeClasses: (variant: string) => string;
  setCurrentView: (view: string) => void;
}

const InfoView: React.FC<InfoViewProps> = ({ t, getThemeClasses, setCurrentView }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center">
        <button type="button" onClick={() => setCurrentView('settings')} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
          <ChevronLeft />
        </button>
        <h2 className={`text-2xl font-bold text-center flex-grow ${getThemeClasses('text-strong')}`}>{t('app_info')}</h2>
      </div>
      <div className={`p-6 rounded-lg ${getThemeClasses('bg-light')} space-y-4 text-gray-700`}>
        <p className="text-lg">
            Welkom bij Schoolmaps! Deze applicatie is jouw ultieme partner voor het organiseren van je schoolleven. Ontworpen voor studenten die efficiëntie en overzicht waarderen. Ons doel is om alle tools die je nodig hebt voor succes op één centrale, gebruiksvriendelijke plek aan te bieden.
        </p>
        <div>
            <h3 className={`font-bold text-lg ${getThemeClasses('text')}`}>Kernfuncties:</h3>
            <ul className="list-disc list-inside ml-4 space-y-2 mt-2">
                <li><b>Bestandsbeheer:</b> Upload en organiseer al je schoolbestanden per vak. Voeg titels en beschrijvingen toe om alles snel terug te vinden. Nooit meer zoeken naar dat ene verslag!</li>
                <li><b>Agenda:</b> Houd al je toetsen, huiswerk en presentaties bij in een overzichtelijke weekkalender. Voeg specifieke tijden toe en mis nooit meer een deadline.</li>
                <li><b>Flashcards 2.0:</b> Maak je eigen digitale flashcard-decks per vak en onderwerp. Ons slimme leersysteem helpt je focussen op de kaarten die je nog niet kent.</li>
                <li><b>Notities & Taken:</b> Leg snel ideeën vast in notities, georganiseerd per vak, of houd je voortgang bij met een simpele, effectieve takenlijst.</li>
                <li><b>Studeertimer:</b> Gebruik de ingebouwde, aanpasbare timer om gefocust te blijven tijdens je studiesessies en effectieve pauzes te nemen.</li>
                <li><b>Personalisatie:</b> Kies je eigen thema en taal om de app volledig aan jouw stijl aan te passen.</li>
            </ul>
        </div>
        <p>
            We zijn constant bezig met het verbeteren van Schoolmaps en het toevoegen van nieuwe functies. We hopen dat deze app je helpt om georganiseerd te blijven en je schoolprestaties te verbeteren. Voor vragen of suggesties, neem gerust contact op.
        </p>
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>{t('version')} 1.2.0</p>
          <p>&copy; 2025 Schoolmaps. {t('copyright')}</p>
        </div>
      </div>
    </div>
  );
};

export default InfoView;
