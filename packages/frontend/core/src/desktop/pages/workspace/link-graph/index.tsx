import { Button } from '@affine/component';
import { DocGraphService } from '@affine/core/modules/doc-graph';
import { LinkGraphCanvas } from '@affine/core/modules/doc-graph/views/link-graph-canvas';
import * as styles from '@affine/core/modules/doc-graph/views/styles.css';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Header } from '../../../../components/pure/header';

export const LinkGraphPage = () => {
  const t = useI18n();
  const docGraphService = useService(DocGraphService);
  const workbench = useService(WorkbenchService).workbench;
  const featureFlagService = useService(FeatureFlagService);
  const enabled = useLiveData(featureFlagService.flags.enable_link_graph.$);
  const [searchParams] = useSearchParams();

  const snapshot = useLiveData(docGraphService.graphSnapshot$);
  const isLoading = useLiveData(docGraphService.isLoading$);
  const filters = useLiveData(docGraphService.filters$);

  useEffect(() => {
    const center = searchParams.get('center');
    if (center) {
      docGraphService.openLocalGraph(center);
    }
  }, [docGraphService, searchParams]);

  const handleNodeClick = useCallback(
    (docId: string) => {
      workbench.openDoc(docId, { at: 'active' });
    },
    [workbench]
  );

  if (!enabled) {
    return null;
  }

  return (
    <>
      <ViewTitle title={t['com.affine.link-graph.title']()} />
      <ViewIcon icon="linkGraph" />
      <ViewHeader>
        <Header
          left={
            <div style={{ fontSize: 18, fontWeight: 600, paddingLeft: 8 }}>
              {t['com.affine.link-graph.title']()}
            </div>
          }
        />
      </ViewHeader>
      <ViewBody>
        <div className={styles.pageBody}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarGroup}>
              <Button
                variant={filters.mode === 'global' ? 'primary' : 'plain'}
                onClick={() => docGraphService.setFilters({ mode: 'global' })}
              >
                {t['com.affine.link-graph.mode.global']()}
              </Button>
              <Button
                variant={filters.mode === 'local' ? 'primary' : 'plain'}
                onClick={() =>
                  docGraphService.setFilters({
                    mode: 'local',
                    centerDocId: filters.centerDocId,
                  })
                }
              >
                {t['com.affine.link-graph.mode.local']()}
              </Button>
            </div>
            {filters.mode === 'local' ? (
              <div className={styles.toolbarGroup}>
                <Button
                  variant={filters.localDepth === 1 ? 'primary' : 'plain'}
                  onClick={() => docGraphService.setFilters({ localDepth: 1 })}
                >
                  {t['com.affine.link-graph.depth.one']()}
                </Button>
                <Button
                  variant={filters.localDepth === 2 ? 'primary' : 'plain'}
                  onClick={() => docGraphService.setFilters({ localDepth: 2 })}
                >
                  {t['com.affine.link-graph.depth.two']()}
                </Button>
              </div>
            ) : null}
            <label className={styles.toolbarGroup}>
              <input
                type="checkbox"
                checked={!!filters.hideOrphans}
                onChange={e =>
                  docGraphService.setFilters({ hideOrphans: e.target.checked })
                }
              />
              {t['com.affine.link-graph.hide-orphans']()}
            </label>
            <input
              className={styles.searchInput}
              placeholder={t['com.affine.link-graph.search']()}
              value={filters.searchQuery ?? ''}
              onChange={e =>
                docGraphService.setFilters({
                  searchQuery: e.target.value,
                })
              }
            />
            <div className={styles.stats}>
              {snapshot
                ? t['com.affine.link-graph.stats']({
                    nodes: snapshot.stats.nodeCount,
                    edges: snapshot.stats.edgeCount,
                  })
                : null}
              {isLoading ? ` · ${t['com.affine.link-graph.loading']()}` : null}
            </div>
          </div>
          {snapshot?.stats.truncated ? (
            <div className={styles.warning}>
              {t['com.affine.link-graph.truncated']()}
            </div>
          ) : null}
          {snapshot && !isLoading ? (
            <LinkGraphCanvas
              snapshot={snapshot}
              onNodeClick={handleNodeClick}
              emptyLabel={t['com.affine.link-graph.empty']()}
            />
          ) : (
            <div className={styles.graphContainer}>
              <div className={styles.emptyState}>
                {isLoading
                  ? t['com.affine.link-graph.loading']()
                  : t['com.affine.link-graph.empty']()}
              </div>
            </div>
          )}
        </div>
      </ViewBody>
    </>
  );
};

export const Component = () => <LinkGraphPage />;
