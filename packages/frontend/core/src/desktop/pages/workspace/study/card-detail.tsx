import { useParams } from 'react-router-dom';

import { StudyCardsPage } from './cards';

export const StudyCardDetailPage = () => {
  const { cardId = '' } = useParams<{ cardId: string }>();
  return <StudyCardsPage autoEditCardId={cardId} />;
};

export const Component = () => <StudyCardDetailPage />;
