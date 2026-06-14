import type { StudyCardContent } from '../entities/card';
import type { StudyDeck } from '../entities/deck';

export function buildCardMap(cards: StudyCardContent[]) {
  return new Map(cards.map(card => [card.id, card]));
}

export function getDeckCards(
  deck: StudyDeck,
  cards: StudyCardContent[]
): StudyCardContent[] {
  const map = buildCardMap(cards);
  return deck.cardIds
    .map(id => map.get(id))
    .filter((card): card is StudyCardContent => !!card);
}

export function getDecksForCard(cardId: string, decks: StudyDeck[]) {
  return decks.filter(deck => deck.cardIds.includes(cardId));
}

export function getDecksForDoc(docId: string, decks: StudyDeck[]) {
  return decks.filter(deck => {
    const primary = deck.sourceDocId ?? deck.metadata?.sourcePage?.docId;
    if (primary === docId) {
      return true;
    }
    return deck.metadata?.sourceLinks?.includes(docId) ?? false;
  });
}

export function isCardInAnyDeck(cardId: string, decks: StudyDeck[]) {
  return decks.some(deck => deck.cardIds.includes(cardId));
}

export function pruneDeckCardIds(
  deck: StudyDeck,
  validCardIds: Set<string>
): StudyDeck {
  return {
    ...deck,
    cardIds: deck.cardIds.filter(id => validCardIds.has(id)),
  };
}
