import { notify } from '@affine/component';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { GlobalStateService } from '@affine/core/modules/storage';
import { StudyService } from '@affine/core/modules/study';
import { studyDailyReminderStorageKey } from '@affine/core/modules/study/stores/storage-keys';
import {
  buildStudyDailyReminderDeckSummary,
  formatLocalDate,
} from '@affine/core/modules/study/utils/daily-reminder';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import { TodayIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useEffect } from 'react';

const REMINDER_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export const StudyDailyReminder = () => {
  const t = useI18n();
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const workspace = useService(WorkspaceService).workspace;
  const globalStateService = useService(GlobalStateService);
  const featureFlagService = useService(FeatureFlagService);
  const studyEnabled = useLiveData(featureFlagService.flags.enable_study.$);
  const dueCount = useLiveData(studyService.dueCount$);
  const decks = useLiveData(studyService.decks$);
  const dueByDeck = useLiveData(studyService.dueCountByDeck$);

  const navigateToReview = useCallback(() => {
    workbench.open('/study/review', { at: 'active' });
  }, [workbench]);

  const maybeSendDailyReminder = useCallback(() => {
    if (!studyEnabled || !studyService.enabled) {
      return;
    }

    const currentDueCount = studyService.dueCount$.value;
    if (currentDueCount <= 0) {
      return;
    }

    const today = formatLocalDate(new Date());
    const storageKey = studyDailyReminderStorageKey(workspace.id);
    const lastSent = globalStateService.globalState.get<string>(storageKey);
    if (lastSent === today) {
      return;
    }

    const deckSummary = buildStudyDailyReminderDeckSummary(
      studyService.decks$.value,
      studyService.dueCountByDeck$.value
    );
    const title = t['com.affine.study.daily-reminder.title']();
    const message = deckSummary
      ? t['com.affine.study.daily-reminder.summary-with-decks']({
          count: String(currentDueCount),
          decks: deckSummary,
        })
      : t['com.affine.study.daily-reminder.summary']({
          count: String(currentDueCount),
        });

    globalStateService.globalState.set(storageKey, today);

    if (
      document.hidden &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      const notification = new Notification(title, { body: message });
      notification.onclick = () => {
        window.focus();
        navigateToReview();
        notification.close();
      };
      return;
    }

    notify({
      icon: <TodayIcon />,
      title,
      message,
      rootAttrs: {
        style: { cursor: 'pointer' },
        onClick: event => {
          if (
            event.target instanceof Element &&
            event.target.closest('[data-testid="notification-close-button"]')
          ) {
            return;
          }
          navigateToReview();
        },
      },
      actions: [
        {
          key: 'review',
          label: t['com.affine.study.review'](),
          onClick: navigateToReview,
        },
      ],
    });
  }, [
    globalStateService,
    navigateToReview,
    studyEnabled,
    studyService,
    t,
    workspace.id,
  ]);

  useEffect(() => {
    if (!studyEnabled || !studyService.enabled) {
      return;
    }
    if (typeof Notification === 'undefined') {
      return;
    }
    if (Notification.permission !== 'default') {
      return;
    }
    Notification.requestPermission().catch(console.error);
  }, [studyEnabled, studyService]);

  useEffect(() => {
    maybeSendDailyReminder();

    const intervalId = window.setInterval(
      maybeSendDailyReminder,
      REMINDER_CHECK_INTERVAL_MS
    );
    const handleVisibilityOrFocus = () => {
      maybeSendDailyReminder();
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [maybeSendDailyReminder]);

  useEffect(() => {
    if (dueCount > 0) {
      maybeSendDailyReminder();
    }
  }, [dueCount, decks, dueByDeck, maybeSendDailyReminder]);

  return null;
};
