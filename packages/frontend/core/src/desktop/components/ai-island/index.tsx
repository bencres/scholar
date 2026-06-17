import { useNewDoc } from '@affine/core/modules/app-sidebar/views/add-page-button';
import { WorkspaceDialogService } from '@affine/core/modules/dialogs';
import { DocsService } from '@affine/core/modules/doc';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { GlobalContextService } from '@affine/core/modules/global-context';
import { StudyService } from '@affine/core/modules/study';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import track from '@affine/track';
import { FlashPanelIcon, PlusIcon } from '@blocksuite/icons/rc';
import {
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';
import clsx from 'clsx';
import { type MouseEvent, useCallback, useEffect, useState } from 'react';

import { IslandContainer } from './container';
import {
  aiIslandBtn,
  aiIslandHoverZone,
  aiIslandStack,
  aiIslandWrapper,
  generateDeckBtn,
  toolStyle,
} from './styles.css';

const hideIsland: Array<string | ((path: string) => boolean)> = [
  '/chat',
  path => path.includes('attachments'),
];

export const AIIsland = () => {
  const t = useI18n();
  const [hide, setHide] = useState(true);

  const workbench = useService(WorkbenchService).workbench;
  const createDoc = useNewDoc();
  const globalContext = useService(GlobalContextService).globalContext;
  const docsService = useService(DocsService);
  const workspaceDialogService = useService(WorkspaceDialogService);
  const featureFlagService = useService(FeatureFlagService);
  const studyService = useServiceOptional(StudyService);

  const activeView = useLiveData(workbench.activeView$);
  const haveChatTab = useLiveData(
    activeView.sidebarTabs$.map(tabs => tabs.some(tab => tab.id === 'chat'))
  );
  const activeLocation = useLiveData(activeView.location$);
  const activeTab = useLiveData(activeView.activeSidebarTab$);
  const sidebarOpen = useLiveData(workbench.sidebarOpen$);

  const docId = useLiveData(globalContext.docId.$);
  const docMode = useLiveData(globalContext.docMode.$);
  const docRecordList = docsService.list;
  const doc = useLiveData(docId ? docRecordList.doc$(docId) : undefined);
  const inTrash = useLiveData(doc?.meta$)?.trash;
  const enableStudy = useLiveData(featureFlagService.flags.enable_study.$);

  const canGenerateDeck =
    !!docId &&
    !inTrash &&
    enableStudy &&
    !!studyService?.enabled &&
    docMode !== 'edgeless';

  useEffect(() => {
    let shouldHide = true;
    if (haveChatTab) {
      shouldHide = !!sidebarOpen && activeTab?.id === 'chat';
    } else {
      const path = activeLocation.pathname;
      shouldHide = hideIsland.some(item =>
        typeof item === 'string' ? path === item : item(path)
      );
    }
    setHide(shouldHide);
  }, [activeLocation.pathname, activeTab, haveChatTab, sidebarOpen]);

  const onCreatePage = useCallback(
    (event?: MouseEvent) => {
      if (hide) return;
      createDoc(event, 'page');
      track.$.navigationPanel.$.createDoc();
      track.$.sidebar.newDoc.quickStart({ with: 'page' });
    },
    [createDoc, hide]
  );

  const onGenerateDeck = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      if (hide || !docId || !canGenerateDeck) return;
      workspaceDialogService.open('study-generate', {
        docId,
        autoGenerate: true,
      });
    },
    [canGenerateDeck, docId, hide, workspaceDialogService]
  );

  return (
    <IslandContainer className={clsx(toolStyle, { hide })}>
      <div className={aiIslandWrapper} data-hide={hide}>
        <div className={aiIslandStack}>
          <div className={aiIslandHoverZone}>
            <button
              type="button"
              className={aiIslandBtn}
              data-testid="note-island-new-page"
              onClick={onCreatePage}
              aria-label={t['New Page']()}
            >
              <PlusIcon width={20} height={20} />
            </button>
            {canGenerateDeck ? (
              <button
                type="button"
                className={generateDeckBtn}
                data-testid="note-island-generate-deck"
                onClick={onGenerateDeck}
                aria-label={t['com.affine.study.generate.menu']()}
              >
                <FlashPanelIcon width={16} height={16} />
                <span>{t['com.affine.study.generate.title']()}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </IslandContainer>
  );
};
