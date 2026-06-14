import { Divider, PropertyCollapsibleSection } from '@affine/component';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { StudyService } from '@affine/core/modules/study';
import { getDecksForDoc } from '@affine/core/modules/study/utils/study-storage';
import { WorkbenchLink } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import { useMemo } from 'react';

import * as styles from './styles.css';

export const StudyDocDecksSection = ({
  docId,
  onNavigate,
}: {
  docId: string;
  onNavigate?: () => void;
}) => {
  const t = useI18n();
  const studyService = useService(StudyService);
  const featureFlagService = useService(FeatureFlagService);
  const enableStudy = useLiveData(featureFlagService.flags.enable_study.$);
  const decks = useLiveData(studyService.decks$);
  const docDecks = useMemo(() => getDecksForDoc(docId, decks), [decks, docId]);

  if (!enableStudy || !studyService.enabled || !docDecks.length) {
    return null;
  }

  return (
    <>
      <PropertyCollapsibleSection
        title={`${t['com.affine.page-properties.study-decks']()} · ${docDecks.length}`}
      >
        <div className={styles.docDeckLinks}>
          {docDecks.map(deck => (
            <WorkbenchLink
              key={deck.id}
              to={`/study/decks/${deck.id}`}
              className={styles.docDeckLink}
              onClick={onNavigate}
            >
              {deck.name}
            </WorkbenchLink>
          ))}
        </div>
      </PropertyCollapsibleSection>
      <Divider size="thinner" />
    </>
  );
};
