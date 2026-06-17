import type { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { RightSidebarIcon, SidebarIcon } from '@blocksuite/icons/rc';

import type { AppSidebarService } from '../modules/app-sidebar';
import type { WorkbenchService } from '../modules/workbench';
import { registerAffineCommand } from './registry';

export function registerAffineLayoutCommands({
  t,
  appSidebarService,
  workbenchService,
}: {
  t: ReturnType<typeof useI18n>;
  appSidebarService: AppSidebarService;
  workbenchService?: WorkbenchService;
}) {
  const unsubs: Array<() => void> = [];
  unsubs.push(
    registerAffineCommand({
      id: 'affine:toggle-left-sidebar',
      category: 'affine:layout',
      icon: <SidebarIcon />,
      label: () =>
        appSidebarService.sidebar.open$.value
          ? t['com.affine.cmdk.affine.left-sidebar.collapse']()
          : t['com.affine.cmdk.affine.left-sidebar.expand'](),

      keyBinding: {
        binding: '$mod+/',
      },
      run() {
        track.$.navigationPanel.$.toggle({
          type: appSidebarService.sidebar.open$.value ? 'collapse' : 'expand',
        });
        appSidebarService.sidebar.toggleSidebar();
      },
    })
  );

  if (workbenchService) {
    const workbench = workbenchService.workbench;
    unsubs.push(
      registerAffineCommand({
        id: 'affine:toggle-right-sidebar',
        category: 'affine:layout',
        icon: <RightSidebarIcon />,
        label: () =>
          workbench.sidebarOpen$.value
            ? t['com.affine.cmdk.affine.right-sidebar.collapse']()
            : t['com.affine.cmdk.affine.right-sidebar.expand'](),
        keyBinding: {
          binding: '$mod+\\',
        },
        run() {
          track.$.navigationPanel.$.toggle({
            type: workbench.sidebarOpen$.value ? 'collapse' : 'expand',
          });
          workbench.toggleSidebar();
        },
      })
    );
  }

  return () => {
    unsubs.forEach(unsub => unsub());
  };
}
