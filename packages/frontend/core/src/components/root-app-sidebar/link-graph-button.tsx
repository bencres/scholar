import { MenuLinkItem } from '@affine/core/modules/app-sidebar/views';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { ViewLayersIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';

export const AppSidebarLinkGraphButton = () => {
  const t = useI18n();
  const featureFlagService = useService(FeatureFlagService);
  const workbench = useService(WorkbenchService).workbench;
  const location = useLiveData(workbench.location$);
  const enabled = useLiveData(featureFlagService.flags.enable_link_graph.$);

  if (!enabled || BUILD_CONFIG.isMobileEdition) {
    return null;
  }

  return (
    <MenuLinkItem
      data-testid="slider-bar-link-graph-button"
      active={location.pathname.startsWith('/graph')}
      to="/graph"
      icon={<ViewLayersIcon />}
    >
      {t['com.affine.link-graph.title']()}
    </MenuLinkItem>
  );
};
